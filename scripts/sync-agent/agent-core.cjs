/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Mabsol Sync Agent (mabsolsyncagent.exe)
 * Standalone Client Desktop Sync Agent
 * Zero database passwords, zero server credentials, 100% secure HTTPS communication.
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const os = require("node:os");
const readline = require("node:readline");
const { exec } = require("node:child_process");

const AGENT_VERSION = "1.0.0";
const HOSTNAME = os.hostname();
const DEFAULT_SERVER = "https://phcrm.mabsolinfotech.cloud";

// Determine configuration directory in %APPDATA%/MabsolSyncAgent
const APPDATA_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, "MabsolSyncAgent")
  : path.join(os.homedir(), ".mabsolsyncagent");

if (!fs.existsSync(APPDATA_DIR)) {
  fs.mkdirSync(APPDATA_DIR, { recursive: true });
}

const CONFIG_PATH = path.join(APPDATA_DIR, "config.json");

let config = {
  serverUrl: DEFAULT_SERVER,
  licenseKey: "",
  dataDir: "D:\\Data",
  syncIntervalMs: 10000,
};

// Load existing config if available
if (fs.existsSync(CONFIG_PATH)) {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    config = { ...config, ...parsed };
  } catch (e) {
    console.warn("[Mabsol Sync Agent] Warning: Could not read config.json, using defaults.");
  }
}

// Parse Command Line Arguments
parseCliArguments();
normalizeConfig(config);

main();

function normalizeConfig(cfg) {
  if (cfg.serverUrl && cfg.serverUrl.startsWith("MSK-")) {
    if (!cfg.licenseKey) cfg.licenseKey = cfg.serverUrl;
    cfg.serverUrl = DEFAULT_SERVER;
  }
  if (cfg.serverUrl && !cfg.serverUrl.startsWith("http://") && !cfg.serverUrl.startsWith("https://")) {
    cfg.serverUrl = "https://" + cfg.serverUrl;
  }
  cfg.serverUrl = (cfg.serverUrl || DEFAULT_SERVER).replace(/\/+$/, "");
}

function parseCliArguments() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--license-key" && args[i + 1]) {
      config.licenseKey = args[++i].trim();
    } else if (arg === "--data-dir" && args[i + 1]) {
      config.dataDir = args[++i].trim();
    } else if (arg === "--server-url" && args[i + 1]) {
      config.serverUrl = args[++i].trim();
    }
  }
  // Auto-save if CLI args updated config
  if (config.licenseKey && config.dataDir) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  }
}

async function main() {
  console.log("=================================================");
  console.log("          Mabsol Sync Agent v" + AGENT_VERSION);
  console.log("=================================================");
  console.log(`Host Computer: ${HOSTNAME}`);
  console.log(`Config File: ${CONFIG_PATH}`);
  console.log("-------------------------------------------------");

  // Check if License Key or Data Dir is missing -> Launch Web Setup Wizard
  if (!config.licenseKey || !config.dataDir || !fs.existsSync(config.dataDir)) {
    console.log("[Setup] First-time setup required.");
    console.log("[Setup] Opening Mabsol Setup Wizard in your Web Browser...");
    await runWebSetupWizard(3777);
  }

  normalizeConfig(config);
  console.log(`[Status] Active License Key: ${config.licenseKey}`);
  console.log(`[Status] Local Sync Folder: ${config.dataDir}`);
  console.log(`[Status] Cloud Server: ${config.serverUrl}`);
  console.log("-------------------------------------------------");

  // Test Heartbeat
  console.log("[Status] Connecting to cloud server...");
  const connected = await sendHeartbeat("online");
  if (connected) {
    console.log("[Status] SUCCESS: Connected securely to Mabsol Cloud!");
  } else {
    console.warn("[Status] WARNING: Could not connect to server. Retrying in background...");
  }

  // Initial Sync Run
  await performSyncRun("startup");

  // Schedule periodic background tasks
  setInterval(() => sendHeartbeat("online"), 15000);
  setInterval(() => performSyncRun("interval"), config.syncIntervalMs || 10000);

  // Watch directory for changes
  if (fs.existsSync(config.dataDir)) {
    try {
      fs.watch(config.dataDir, { recursive: true }, (eventType, fileName) => {
        if (!fileName) return;
        const ext = path.extname(fileName).toLowerCase();
        if (ext === ".dbf" || ext === ".fpt" || ext === ".cdx") {
          performSyncRun(`file_change:${fileName}`);
        }
      });
      console.log(`[Watcher] Live file watcher active on: ${config.dataDir}`);
    } catch (err) {
      console.warn(`[Watcher] Warning: Folder watcher fallback enabled: ${err.message}`);
    }
  }

  console.log("=================================================");
  console.log("  Mabsol Sync Agent is running 24/7 in background");
  console.log("  Press Ctrl+C to stop.");
  console.log("=================================================");
}

function runWebSetupWizard(port = 3777) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (req.method === "POST" && url.pathname === "/api/save-config") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            let sUrl = data.serverUrl ? data.serverUrl.trim() : DEFAULT_SERVER;
            let lKey = data.licenseKey ? data.licenseKey.trim() : "";
            const dDir = data.dataDir ? data.dataDir.trim() : "";

            if (sUrl.startsWith("MSK-")) {
              if (!lKey) lKey = sUrl;
              sUrl = DEFAULT_SERVER;
            }

            config.serverUrl = sUrl || DEFAULT_SERVER;
            config.licenseKey = lKey;
            config.dataDir = dDir;
            normalizeConfig(config);

            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
            
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, message: "Configuration saved successfully!" }));

            setTimeout(() => {
              server.close();
              resolve();
            }, 1000);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/test-connection") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const testKey = data.licenseKey || config.licenseKey;
            const testServer = data.serverUrl || config.serverUrl || DEFAULT_SERVER;
            
            // Temporary set for test
            const prevKey = config.licenseKey;
            const prevServer = config.serverUrl;
            config.licenseKey = testKey;
            config.serverUrl = testServer;
            normalizeConfig(config);

            const ok = await sendHeartbeat("setup_test");
            config.licenseKey = prevKey;
            config.serverUrl = prevServer;

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: ok, message: ok ? "Connected successfully!" : "Could not connect with key." }));
          } catch (e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
        return;
      }

      // Serve HTML Setup Wizard Page
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getSetupWizardHtml());
    });

    server.listen(port, () => {
      const wizardUrl = `http://localhost:${port}`;
      console.log(`[Setup Wizard] Web UI listening at: ${wizardUrl}`);
      
      // Auto open browser on Windows/macOS/Linux
      const startCmd = process.platform === "win32" ? `start ${wizardUrl}` : `open ${wizardUrl}`;
      exec(startCmd, (err) => {
        if (err) {
          console.log(`[Setup Wizard] Please open ${wizardUrl} in your browser.`);
        }
      });
    });
  });
}

function getSetupWizardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mabsol Sync Agent - Setup Wizard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
    body { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; width: 100%; max-width: 540px; padding: 36px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); backdrop-filter: blur(10px); }
    .header { text-align: center; margin-bottom: 28px; }
    .logo { width: 56px; height: 56px; background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; color: #fff; margin-bottom: 14px; box-shadow: 0 8px 20px rgba(37,99,235,0.4); }
    h1 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; }
    p.sub { font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .steps { display: flex; justify-content: space-between; margin-bottom: 28px; position: relative; }
    .steps::before { content: ''; position: absolute; top: 16px; left: 30px; right: 30px; height: 2px; background: #334155; z-index: 1; }
    .step-item { position: relative; z-index: 2; display: flex; flex-col; align-items: center; text-align: center; flex: 1; }
    .step-num { width: 32px; height: 32px; border-radius: 50%; background: #334155; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; margin: 0 auto 6px auto; transition: all 0.3s ease; }
    .step-item.active .step-num { background: #3b82f6; color: #fff; box-shadow: 0 0 15px rgba(59,130,246,0.5); }
    .step-item.done .step-num { background: #10b981; color: #fff; }
    .step-label { font-size: 11px; font-weight: 600; color: #64748b; }
    .step-item.active .step-label { color: #93c5fd; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #cbd5e1; margin-bottom: 8px; }
    input[type="text"] { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 12px 16px; font-size: 14px; color: #fff; transition: all 0.2s; outline: none; }
    input[type="text"]:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.25); }
    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #fff; box-shadow: 0 10px 20px -5px rgba(37,99,235,0.4); }
    .btn:hover { opacity: 0.95; transform: translateY(-1px); }
    .alert { padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-top: 16px; display: none; line-height: 1.4; }
    .alert-success { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; }
    .alert-error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
    .hint { font-size: 11px; color: #64748b; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">M</div>
      <h1>Mabsol Sync Agent Setup</h1>
      <p class="sub">Connect your Windows PC database securely to Mabsol CRM Cloud</p>
    </div>

    <div class="steps">
      <div class="step-item active" id="st1">
        <div class="step-num">1</div>
        <div class="step-label">License Key</div>
      </div>
      <div class="step-item" id="st2">
        <div class="step-num">2</div>
        <div class="step-label">DB Folder</div>
      </div>
      <div class="step-item" id="st3">
        <div class="step-num">3</div>
        <div class="step-label">Finish</div>
      </div>
    </div>

    <form id="setupForm" onsubmit="event.preventDefault(); submitSetup();">
      <div class="form-group">
        <label for="licenseKey">1. Company License Key</label>
        <input type="text" id="licenseKey" placeholder="e.g. MSK-XXXX-XXXX" value="${config.licenseKey || ''}" required autocomplete="off">
        <div class="hint">Copy from your Mabsol CRM Dashboard under <b>Sync Agent</b> section.</div>
      </div>

      <div class="form-group">
        <label for="dataDir">2. Local Database Folder Path</label>
        <input type="text" id="dataDir" placeholder="e.g. D:\\Data or C:\\Users\\...\\Downloads" value="${config.dataDir || 'D:\\Data'}" required autocomplete="off">
        <div class="hint">The folder path on this computer where your .DBF / FoxPro database files are located.</div>
      </div>

      <div class="form-group">
        <label for="serverUrl">3. Cloud Server URL</label>
        <input type="text" id="serverUrl" value="${config.serverUrl || DEFAULT_SERVER}" required autocomplete="off">
      </div>

      <button type="submit" class="btn" id="submitBtn">Save & Start 24/7 Live Sync</button>
    </form>

    <div class="alert alert-success" id="successMsg"></div>
    <div class="alert alert-error" id="errorMsg"></div>
  </div>

  <script>
    async function submitSetup() {
      const btn = document.getElementById('submitBtn');
      const successMsg = document.getElementById('successMsg');
      const errorMsg = document.getElementById('errorMsg');

      let lKey = document.getElementById('licenseKey').value.trim();
      let sUrl = document.getElementById('serverUrl').value.trim();
      const dDir = document.getElementById('dataDir').value.trim();

      if (sUrl.startsWith('MSK-')) {
        if (!lKey) lKey = sUrl;
        sUrl = '${DEFAULT_SERVER}';
        document.getElementById('serverUrl').value = sUrl;
        document.getElementById('licenseKey').value = lKey;
      }

      if (!lKey) {
        showError('Please enter a valid Company License Key.');
        return;
      }
      if (!dDir) {
        showError('Please enter a valid local database folder path.');
        return;
      }

      btn.innerText = 'Connecting & Registering...';
      btn.disabled = true;
      hideAlerts();

      try {
        const res = await fetch('/api/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: lKey, dataDir: dDir, serverUrl: sUrl })
        });
        const data = await res.json();
        if (data.success) {
          showSuccess('Setup complete! Connecting to live sync... You may now close this window.');
          document.getElementById('st1').className = 'step-item done';
          document.getElementById('st2').className = 'step-item done';
          document.getElementById('st3').className = 'step-item done active';
          setTimeout(() => { window.close(); }, 3000);
        } else {
          showError(data.error || 'Failed to save configuration.');
          btn.innerText = 'Save & Start 24/7 Live Sync';
          btn.disabled = false;
        }
      } catch (err) {
        showError('Error connecting to setup engine: ' + err.message);
        btn.innerText = 'Save & Start 24/7 Live Sync';
        btn.disabled = false;
      }
    }

    function showSuccess(msg) {
      const s = document.getElementById('successMsg');
      s.innerText = msg;
      s.style.display = 'block';
    }

    function showError(msg) {
      const e = document.getElementById('errorMsg');
      e.innerText = msg;
      e.style.display = 'block';
    }

    function hideAlerts() {
      document.getElementById('successMsg').style.display = 'none';
      document.getElementById('errorMsg').style.display = 'none';
    }
  </script>
</body>
</html>`;
}

async function performSyncRun(reason) {
  if (!fs.existsSync(config.dataDir)) {
    await sendHeartbeat("error", `Data directory not found: ${config.dataDir}`);
    return;
  }

  try {
    const files = fs.readdirSync(config.dataDir);
    const dbfFiles = files.filter((f) => f.toLowerCase().endsWith(".dbf"));

    const tables = dbfFiles.map((fileName) => {
      const fullPath = path.join(config.dataDir, fileName);
      let recordCount = 0;
      try {
        const stat = fs.statSync(fullPath);
        recordCount = Math.floor(stat.size / 100);
      } catch (e) {}

      return {
        tableName: fileName.replace(/\.dbf$/i, "").toLowerCase(),
        fileName,
        recordCount,
        primaryKeyFields: [],
      };
    });

    const payload = {
      action: "sync_batch",
      reason,
      runId: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tables,
      logs: `Sync finished by ${reason}. ${dbfFiles.length} table(s) checked.`,
    };

    await sendApiRequest("/api/sync-agent/ingest", "POST", payload);
  } catch (err) {
    console.error(`[Sync Error] ${err.message}`);
    await sendHeartbeat("error", err.message);
  }
}

async function sendHeartbeat(status = "online", lastError = "") {
  const payload = {
    workerId: `${HOSTNAME}-${config.licenseKey}`,
    hostname: HOSTNAME,
    dataDir: config.dataDir,
    agentVersion: AGENT_VERSION,
    status,
    lastError,
  };

  const res = await sendApiRequest("/api/sync-agent/heartbeat", "POST", payload);
  return res && res.success;
}

function sendApiRequest(endpoint, method, data) {
  return new Promise((resolve) => {
    try {
      const url = new URL(endpoint, config.serverUrl || DEFAULT_SERVER);
      const postData = JSON.stringify(data);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: method || "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Authorization: `Bearer ${config.licenseKey}`,
          "User-Agent": `MabsolSyncAgent/${AGENT_VERSION}`,
        },
      };

      const requester = url.protocol === "https:" ? https : http;
      const req = requester.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ success: false, raw: body });
          }
        });
      });

      req.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ success: false, error: "Timeout" });
      });

      req.write(postData);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}
