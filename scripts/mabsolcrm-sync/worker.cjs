/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");
const os = require("node:os");

const WORKER_ID = `${os.hostname()}-${process.pid}`;
let isRunning = false;
let scheduledTimer = null;
const activeWatchers = new Map();

// Helper to load env file if present
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // Ignore env parse errors
  }
}

// 1. Try loading env files
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
loadEnvFile(path.join(PROJECT_ROOT, ".env"));
loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(process.cwd(), ".env"));

// 2. Load worker-config.json if present
let workerConfigFile = {};
const configJsonPath = path.join(process.cwd(), "worker-config.json");
if (fs.existsSync(configJsonPath)) {
  try {
    workerConfigFile = JSON.parse(fs.readFileSync(configJsonPath, "utf-8"));
  } catch {
    // Ignore JSON error
  }
}

const CLOUD_URL = (
  process.env.CLOUD_URL ||
  workerConfigFile.cloudUrl ||
  "https://phcrm.mabsolinfotech.cloud"
).replace(/\/+$/, "");

let VFP_DATA_DIR =
  process.env.VFP_DATA_DIR ||
  workerConfigFile.dataDir ||
  "C:\\VFP\\DATA";

const USER_EMAIL =
  process.env.USER_EMAIL ||
  workerConfigFile.email ||
  "";

const MONGODB_URI = process.env.MONGODB_URI;

// Safe load mongoose if available
let mongoose = null;
if (MONGODB_URI) {
  try {
    mongoose = require("mongoose");
  } catch {
    mongoose = null;
  }
}

main().catch((error) => {
  console.error("[vfp-worker] Fatal error:", error);
  process.exitCode = 1;
});

async function main() {
  console.log("========================================================");
  console.log("  Mabsol Pharma CRM - Desktop DBF Sync Worker");
  console.log("========================================================");
  console.log(`[vfp-worker] Cloud URL: ${CLOUD_URL}`);
  console.log(`[vfp-worker] Local DBF Directory: ${VFP_DATA_DIR}`);
  console.log(`[vfp-worker] Worker ID: ${WORKER_ID}`);

  if (MONGODB_URI && mongoose) {
    try {
      await mongoose.connect(MONGODB_URI, { maxPoolSize: 3 });
      console.log(`[vfp-worker] Direct MongoDB connection active`);
    } catch (err) {
      console.warn(`[vfp-worker] Direct MongoDB connection failed, falling back to HTTP Cloud Mode:`, err.message);
    }
  } else {
    console.log(`[vfp-worker] Running in Standalone Zero-Dependency HTTP Cloud Mode`);
  }

  // Initial heartbeat
  await sendHeartbeat("online", "startup", "");

  // Start directory watcher
  setupWatcher(VFP_DATA_DIR);

  // Interval timers
  setInterval(async () => {
    await sendHeartbeat(isRunning ? "syncing" : "online", "interval", "");
  }, 10000);
}

// ----------------------------------------------------------------------
// HTTP Cloud API Communications (Zero External NPM Dependencies)
// ----------------------------------------------------------------------

function sendHeartbeat(status, lastRunReason, lastError) {
  return new Promise((resolve) => {
    try {
      const url = new URL(`${CLOUD_URL}/api/mabsolcrmsync/heartbeat`);
      const transport = url.protocol === "https:" ? https : http;
      const payload = JSON.stringify({
        workerId: WORKER_ID,
        status,
        dataDir: VFP_DATA_DIR,
        lastRunReason,
        lastError,
        email: USER_EMAIL,
      });

      const req = transport.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const responseJson = JSON.parse(data);
              if (responseJson.success) {
                // Check if cloud sent pending sync commands
                if (
                  Array.isArray(responseJson.pendingCommands) &&
                  responseJson.pendingCommands.length > 0
                ) {
                  console.log(
                    `[vfp-worker] Cloud queued command received! Triggering immediate sync...`
                  );
                  scheduleSync("cloud_command");
                }
              }
              resolve(responseJson);
            } catch {
              resolve({ success: false });
            }
          });
        }
      );

      req.on("error", (err) => {
        console.warn(`[vfp-worker] Heartbeat warning (will retry):`, err.message);
        resolve({ success: false });
      });

      req.write(payload);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

function uploadDbfFilesToCloud(dataDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dataDir)) {
      return reject(new Error(`Directory ${dataDir} does not exist.`));
    }

    const files = fs.readdirSync(dataDir).filter((f) => f.toLowerCase().endsWith(".dbf"));
    if (files.length === 0) {
      console.log(`[vfp-worker] No .DBF files found in ${dataDir}`);
      return resolve({ success: true, count: 0 });
    }

    console.log(`[vfp-worker] Uploading ${files.length} DBF file(s) from ${dataDir} to Cloud...`);

    const url = new URL(`${CLOUD_URL}/api/mabsolcrmsync/upload-dbf`);
    const boundary = "----MabsolWorkerBoundary" + Math.random().toString(16).substring(2);
    const transport = url.protocol === "https:" ? https : http;

    const postDataBuffers = [];

    for (const fileName of files) {
      const filePath = path.join(dataDir, fileName);
      if (!fs.existsSync(filePath)) continue;

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
        postDataBuffers.push(Buffer.from(header));
        postDataBuffers.push(fileBuffer);
        postDataBuffers.push(Buffer.from("\r\n"));
      } catch (readErr) {
        console.warn(`[vfp-worker] File locked/busy: ${fileName}, skipping:`, readErr.message);
      }
    }

    if (postDataBuffers.length === 0) {
      return resolve({ success: true, count: 0 });
    }

    postDataBuffers.push(Buffer.from(`--${boundary}--\r\n`));
    const payload = Buffer.concat(postDataBuffers);

    const req = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": payload.length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch {
            resolve({ success: false, error: data });
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// ----------------------------------------------------------------------
// File Watcher & Synchronization Schedule
// ----------------------------------------------------------------------

function setupWatcher(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`[vfp-worker] Data folder ${dirPath} does not exist yet. Watching for creation...`);
    return;
  }

  if (activeWatchers.has(dirPath)) return;

  try {
    const watcher = fs.watch(dirPath, { recursive: true }, (_eventType, fileName) => {
      if (!fileName) return;
      if (!fileName.toLowerCase().endsWith(".dbf")) return;
      console.log(`[vfp-worker] Change detected in ${fileName}`);
      scheduleSync(`file:${fileName}`);
    });
    activeWatchers.set(dirPath, watcher);
    console.log(`[vfp-worker] Watcher active on ${dirPath}`);
  } catch (err) {
    console.warn(`[vfp-worker] Directory watcher warning:`, err.message);
  }
}

function scheduleSync(reason) {
  clearTimeout(scheduledTimer);
  scheduledTimer = setTimeout(() => {
    runSync(reason).catch((err) => {
      console.error("[vfp-worker] Sync failed:", err.message);
    });
  }, 2000);
}

async function runSync(reason) {
  if (isRunning) return;
  isRunning = true;

  try {
    await sendHeartbeat("syncing", reason, "");
    console.log(`[vfp-worker] Starting sync (reason: ${reason})...`);

    const result = await uploadDbfFilesToCloud(VFP_DATA_DIR);
    if (result.success) {
      console.log(
        `[vfp-worker] Sync completed successfully! ${result.message || "Cloud updated."}`
      );
      await sendHeartbeat("online", reason, "");
    } else {
      console.error(`[vfp-worker] Sync returned error:`, result.error || "Upload failed");
      await sendHeartbeat("error", reason, result.error || "Upload failed");
    }
  } catch (err) {
    console.error(`[vfp-worker] Error during sync:`, err.message);
    await sendHeartbeat("error", reason, err.message);
  } finally {
    isRunning = false;
  }
}
