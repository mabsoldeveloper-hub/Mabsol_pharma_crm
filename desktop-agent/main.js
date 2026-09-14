const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const axios = require("axios");
const FormData = require("form-data");

let mainWindow = null;
let syncIntervalTimer = null;
let heartbeatTimer = null;
let isSyncing = false;
let isOnlineState = true;

// Data directory for user config & session storage
const USER_DATA_DIR = app.getPath("userData");
const CONFIG_PATH = path.join(USER_DATA_DIR, "mabsol_sync_config.json");
const SESSION_PATH = path.join(USER_DATA_DIR, "mabsol_auth_session.json");
const QUEUE_PATH = path.join(USER_DATA_DIR, "mabsol_sync_queue.json");

// Engine directory (contains MabsolCRM.EXE, efWin11.fll, vfp9*.dll)
const ENGINE_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "engine")
  : path.join(__dirname, "engine");

// ---------------------------------------------------------------------------
// Helpers: Config & Storage
// ---------------------------------------------------------------------------
function loadConfig() {
  const defaults = {
    cloudUrl: "https://phcrm.mabsolinfotech.cloud",
    companyName: "",
    companyCode: "A01",
    sourceDir: "",
    destDir: path.join(app.getPath("documents"), "MabsolSync", "DecryptedDBF"),
    autoSync: false,
    intervalMins: 10,
    licenseKey: ""
  };
  if (!fs.existsSync(CONFIG_PATH)) return defaults;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function saveConfig(cfg) {
  try {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function loadSession() {
  if (!fs.existsSync(SESSION_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    if (session) {
      fs.writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2), "utf8");
    } else if (fs.existsSync(SESSION_PATH)) {
      fs.unlinkSync(SESSION_PATH);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), "utf8");
  } catch {}
}

function emitLog(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync:log", { timestamp, level, message });
  }
}

function emitStatus(statusObj) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync:status-changed", statusObj);
  }
}

function emitNetwork(isOnline) {
  isOnlineState = isOnline;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("network:status-changed", { isOnline });
  }
}

// ---------------------------------------------------------------------------
// Window Creation
// ---------------------------------------------------------------------------
function createWindow() {
  const iconPath = path.join(__dirname, "mabsol_logo.ico");

  mainWindow = new BrowserWindow({
    width: 980,
    height: 740,
    minWidth: 860,
    minHeight: 640,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: "#0d1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
    title: "Mabsol Pharma CRM - Desktop Sync Agent",
  });

  mainWindow.setMenuBarVisibility(false);

  // Disable DevTools / Inspect inspection
  mainWindow.webContents.on("devtools-opened", () => {
    mainWindow.webContents.closeDevTools();
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      input.key === "F12" ||
      ((input.control || input.meta) && input.shift && (input.key.toLowerCase() === "i" || input.key.toLowerCase() === "j")) ||
      ((input.control || input.meta) && input.key.toLowerCase() === "u")
    ) {
      event.preventDefault();
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  // Start background network heartbeat & queue sync watcher
  startNetworkWatcher();

  // Setup auto-sync if configured
  const cfg = loadConfig();
  if (cfg.autoSync) {
    setupAutoSyncTimer(cfg.intervalMins);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------------------------------------------------------------------------
// IPC Handlers: Authentication
// ---------------------------------------------------------------------------
ipcMain.handle("auth:login", async (_event, { cloudUrl, email, password }) => {
  try {
    emitLog("info", `Authenticating with cloud server (${cloudUrl})...`);
    const cleanUrl = cloudUrl.replace(/\/+$/, "");
    const res = await axios.post(`${cleanUrl}/api/auth/login`, { email, password }, { timeout: 15000 });

    if (res.data && res.data.success) {
      emitLog("success", `Credentials validated! Verification OTP sent to ${email}`);
      return {
        success: true,
        otpRequired: Boolean(res.data.otpRequired),
        email: res.data.email || email,
        message: res.data.message || "OTP sent to your email and WhatsApp"
      };
    } else {
      const msg = res.data?.message || "Invalid email or password.";
      emitLog("error", `Login failed: ${msg}`);
      return { success: false, message: msg };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    emitLog("error", `Login network error: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
});

ipcMain.handle("auth:verify-otp", async (_event, { cloudUrl, email, otp }) => {
  try {
    emitLog("info", "Verifying 6-digit OTP code...");
    const cleanUrl = cloudUrl.replace(/\/+$/, "");
    const res = await axios.post(`${cleanUrl}/api/auth/verify-otp`, { email, otp }, { timeout: 15000 });

    if (res.data && res.data.success) {
      // Extract auth cookie if provided in response headers
      let token = "";
      const setCookies = res.headers["set-cookie"];
      if (Array.isArray(setCookies)) {
        for (const c of setCookies) {
          if (c.startsWith("token=")) {
            token = c.split(";")[0].replace("token=", "");
            break;
          }
        }
      }

      const session = {
        user: res.data.user,
        email,
        token,
        cloudUrl: cleanUrl,
        loggedInAt: new Date().toISOString()
      };
      saveSession(session);
      emitLog("success", `Login verified! Welcome, ${res.data.user?.name || email}`);
      return { success: true, user: res.data.user, session };
    } else {
      const msg = res.data?.message || "Invalid or expired OTP.";
      emitLog("error", `OTP verification failed: ${msg}`);
      return { success: false, message: msg };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    emitLog("error", `OTP error: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
});

ipcMain.handle("auth:check-session", async () => {
  const session = loadSession();
  if (!session || !session.user) return { authenticated: false };
  return { authenticated: true, session };
});

ipcMain.handle("auth:logout", async () => {
  saveSession(null);
  emitLog("info", "Logged out from Desktop Agent.");
  return { success: true };
});

ipcMain.handle("auth:send-edit-otp", async () => {
  const session = loadSession();
  const config = loadConfig();
  const cloudUrl = (session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");
  const email = session?.email || config.userEmail || "";
  const token = session?.token || "";

  try {
    emitLog("info", "Sending settings unlock security code to email...");
    const res = await axios.post(
      `${cloudUrl}/api/mabsolcrmsync/send-otp`,
      { email },
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        timeout: 12000
      }
    );
    if (res.data && res.data.success) {
      emitLog("info", `Security verification code sent to ${email}`);
      return { success: true, message: res.data.message, email };
    }
    return { success: false, message: res.data?.message || "Failed to send verification code." };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    emitLog("error", `Security verification request error: ${msg}`);
    return { success: false, message: msg };
  }
});

ipcMain.handle("auth:verify-edit-otp", async (_event, { otp }) => {
  const session = loadSession();
  const config = loadConfig();
  const cloudUrl = (session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");
  const email = session?.email || config.userEmail || "";
  const token = session?.token || "";

  try {
    emitLog("info", "Verifying security unlock code...");
    const res = await axios.post(
      `${cloudUrl}/api/mabsolcrmsync/verify-otp`,
      { email, otp },
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        timeout: 12000
      }
    );
    if (res.data && res.data.success) {
      emitLog("success", "Settings unlocked! You may now edit the configuration.");
      return { success: true };
    }
    return { success: false, message: res.data?.message || "Invalid or expired security code." };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    emitLog("error", `Settings unlock error: ${msg}`);
    return { success: false, message: msg };
  }
});

// ---------------------------------------------------------------------------
// IPC Handlers: Config & File Dialog
// ---------------------------------------------------------------------------
ipcMain.handle("config:get", async () => {
  return loadConfig();
});

ipcMain.handle("config:save", async (_event, newCfg) => {
  const current = loadConfig();
  const merged = { ...current, ...newCfg };
  const res = saveConfig(merged);
  if (merged.autoSync) {
    setupAutoSyncTimer(merged.intervalMins);
  } else {
    clearInterval(syncIntervalTimer);
  }
  emitLog("info", "Configuration saved successfully.");
  return res;
});

ipcMain.handle("dialog:select-folder", async (_event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || "Select Directory",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("sync:start", async () => {
  if (isSyncing) return { success: false, message: "Sync is already in progress." };
  return await executeDecryptionAndSync("manual");
});

ipcMain.handle("sync:status", async () => {
  const queue = loadQueue();
  return {
    isSyncing,
    isOnline: isOnlineState,
    queuedBatches: queue.length
  };
});

// ---------------------------------------------------------------------------
// Core Decryption Engine & efWin11.fll Cleanup
// ---------------------------------------------------------------------------
async function executeDecryptionAndSync(triggerReason = "manual") {
  if (isSyncing) return { success: false, message: "Sync already active." };
  isSyncing = true;
  emitStatus({ isSyncing: true, lastRunReason: triggerReason });

  const config = loadConfig();
  const session = loadSession();
  const companyCode = (config.companyCode || "A01").trim().toUpperCase();
  const sourceDir = config.sourceDir;
  const destDir = config.destDir;

  emitLog("info", `=== Starting Secure Data Extraction & Sync (Code: ${companyCode}, Trigger: ${triggerReason}) ===`);

  if (!sourceDir || !fs.existsSync(sourceDir)) {
    const msg = `Source folder does not exist: ${sourceDir || "(not set)"}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  if (!destDir) {
    const msg = "Destination folder is not set.";
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  try {
    fs.mkdirSync(destDir, { recursive: true });
  } catch (e) {
    const msg = `Failed to create destination folder: ${e.message}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  // Verify bundled extraction engine
  const engineBinaryPath = path.join(ENGINE_DIR, "MabsolCRM.EXE");
  const engineFllPath = path.join(ENGINE_DIR, "efWin11.fll");

  if (!fs.existsSync(engineBinaryPath)) {
    const msg = `Engine binary missing at: ${engineBinaryPath}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  if (!fs.existsSync(engineFllPath)) {
    const msg = `Engine core library missing at: ${engineFllPath}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  // 1. Scan source directory for files matching .<compcode>
  const sourceFiles = fs.readdirSync(sourceDir);
  const codeExt = `.${companyCode.toLowerCase()}`;
  const matchingFiles = sourceFiles.filter((f) => f.toLowerCase().endsWith(codeExt));

  emitLog("info", `Found ${matchingFiles.length} encrypted record file(s) for code [${companyCode}]`);

  if (matchingFiles.length === 0) {
    emitLog("warn", `No encrypted records found for company code [${companyCode}].`);
  }

  // Standard table stems
  const knownTables = [
    "PRO", "GLEDGER", "DIS", "SUBDIS", "MDIS", "PROBAT", "GLMONTH",
    "PEND", "PENDINGS", "RATE", "MAORDER", "SUPPORT", "ORDER", "SALETYPE", "MDOC"
  ];
  
  // Combine detected tables with known tables
  const tablesSet = new Set(knownTables.map(t => t.toUpperCase()));
  matchingFiles.forEach((file) => {
    const stem = file.substring(0, file.lastIndexOf(".")).toUpperCase();
    tablesSet.add(stem);
  });
  const allTables = Array.from(tablesSet);

  // 2. Prepare destination: Copy core library into destDir temporarily for extraction
  const destFllPath = path.join(destDir, "efWin11.fll");
  try {
    fs.copyFileSync(engineFllPath, destFllPath);
    emitLog("info", "Initialized secure extraction core in working directory...");
  } catch (copyErr) {
    const msg = `Could not initialize extraction library: ${copyErr.message}`;
    emitLog("error", msg);
    isSyncing = false;
    emitStatus({ isSyncing: false, error: msg });
    return { success: false, message: msg };
  }

  // 3. Copy matching encrypted files into destDir
  for (const file of matchingFiles) {
    try {
      const srcPath = path.join(sourceDir, file);
      const dstPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, dstPath);
    } catch (fErr) {
      emitLog("warn", `Skipped copy for ${file}: ${fErr.message}`);
    }
  }

  // 4. Generate dynamic, headless extraction script (guaranteed zero window rendering)
  const prgPath = path.join(destDir, "mabsol_core.prg");
  const fpwPath = path.join(destDir, "mabsol_core.fpw");

  let decryptScript = 
    `_SCREEN.Visible = .F.\r\n` +
    `_SCREEN.WindowState = 1\r\n` +
    `_SCREEN.Caption = ""\r\n` +
    `CLOSE ALL\r\n` +
    `CLEAR\r\n` +
    `SET SAFETY OFF\r\n` +
    `SET CENTURY ON\r\n` +
    `SET DATE BRITISH\r\n` +
    `SET EXCLUSIVE OFF\r\n` +
    `SET TALK OFF\r\n` +
    `SET DELETED ON\r\n\r\n` +
    `LOCAL destpath, libpath, compcode, tbl, srcfile, outdbf\r\n` +
    `compcode = "${companyCode}"\r\n` +
    `destpath = "${destDir.replace(/\\/g, "\\\\")}"\r\n` +
    `SET DEFAULT TO (destpath)\r\n\r\n` +
    `libpath = destpath + "\\\\efWin11.fll"\r\n` +
    `IF FILE(libpath)\r\n` +
    `    SET LIBRARY TO (libpath) ADDITIVE\r\n` +
    `ENDIF\r\n\r\n`;

  for (const tbl of allTables) {
    decryptScript += 
      `tbl = "${tbl}"\r\n` +
      `srcfile = tbl + "." + compcode\r\n` +
      `outdbf = tbl + "_" + compcode + ".DBF"\r\n` +
      `IF FILE(srcfile)\r\n` +
      `    TRY\r\n` +
      `        = efwdecrypt(srcfile, "THYFGXWREZBDCVAS")\r\n` +
      `        SELECT * FROM (srcfile) INTO CURSOR curdata READWRITE\r\n` +
      `        IF RECCOUNT("curdata") > 0\r\n` +
      `            SELECT curdata\r\n` +
      `            COPY TO (outdbf) TYPE FOX2X\r\n` +
      `        ENDIF\r\n` +
      `        USE IN curdata\r\n` +
      `    CATCH\r\n` +
      `    ENDTRY\r\n` +
      `    IF FILE(srcfile)\r\n` +
      `        TRY\r\n` +
      `            DELETE FILE (srcfile)\r\n` +
      `        CATCH\r\n` +
      `        ENDTRY\r\n` +
      `    ENDIF\r\n` +
      `ENDIF\r\n\r\n`;
  }

  decryptScript +=
    `SET LIBRARY TO\r\n` +
    `CLOSE ALL\r\n` +
    `QUIT\r\n`;

  // SCREEN = OFF MUST be the very first line of config.fpw to suppress window creation
  const fpwContent =
    `SCREEN = OFF\r\n` +
    `TITLE = \r\n` +
    `RESOURCE = OFF\r\n` +
    `STATUS = OFF\r\n` +
    `TALK = OFF\r\n` +
    `COMMAND = DO "${prgPath}"\r\n`;

  fs.writeFileSync(prgPath, decryptScript, "utf8");
  fs.writeFileSync(fpwPath, fpwContent, "utf8");

  emitLog("info", "Executing secure extraction engine in background...");

  // 5. Run MabsolCRM.EXE with -t (suppress splash window) and hidden window
  let decryptSuccess = false;
  try {
    await new Promise((resolve, reject) => {
      const engineProcess = spawn(engineBinaryPath, ["-t", `-c${fpwPath}`], {
        cwd: destDir,
        stdio: "ignore",
        windowsHide: true,
        detached: false
      });

      const timer = setTimeout(() => {
        try { engineProcess.kill(); } catch {}
        resolve(); // Continue on timeout
      }, 45000);

      engineProcess.on("close", () => {
        clearTimeout(timer);
        decryptSuccess = true;
        resolve();
      });

      engineProcess.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  } catch (runErr) {
    emitLog("error", `Extraction execution error: ${runErr.message}`);
  } finally {
    // 6. CRITICAL REQUIREMENT: Real-time deletion of extraction library
    try {
      if (fs.existsSync(destFllPath)) {
        fs.unlinkSync(destFllPath);
        emitLog("security", "CONFIRMED: Security core library purged in real-time.");
      }
    } catch (cleanErr) {
      emitLog("warn", `Security core cleanup notice: ${cleanErr.message}`);
    }

    // Clean up temporary script files
    const fxpPath = prgPath.replace(/\.prg$/i, ".fxp");
    try { if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath); } catch {}
    try { if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath); } catch {}
    try { if (fs.existsSync(fxpPath)) fs.unlinkSync(fxpPath); } catch {}
    try { if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath); } catch {}
  }

  // 7. Check generated DBF files
  const destFiles = fs.readdirSync(destDir);
  const dbfFiles = destFiles.filter(f => f.toLowerCase().endsWith(".dbf"));
  emitLog("success", `Data extraction completed. Found ${dbfFiles.length} database table(s) ready for synchronization.`);

  // 8. Offline vs Online Database Sync
  const cloudUrl = (session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");
  const authToken = session?.token || "";
  const userEmail = session?.email || config.userEmail || "";
  const licenseKey = config.licenseKey || "";

  const isCloudReachable = await checkConnectivity(cloudUrl);
  emitNetwork(isCloudReachable);

  if (!isCloudReachable) {
    // OFFLINE MODE: Save to queue
    emitLog("warn", "No internet connection detected. Operating in OFFLINE MODE.");
    enqueueOfflineBatch(destDir, dbfFiles, companyCode);
    emitLog("info", `Offline Queue: ${dbfFiles.length} database table(s) safely stored locally. Will auto-sync once internet is restored.`);
    isSyncing = false;
    emitStatus({
      isSyncing: false,
      isOnline: false,
      lastStatus: "offline_queued",
      tablesCount: dbfFiles.length,
      message: `Offline: ${dbfFiles.length} database tables queued for sync.`
    });
    return {
      success: true,
      offline: true,
      message: `Offline mode: ${dbfFiles.length} database tables queued for auto-sync.`
    };
  }

  // ONLINE MODE: Upload DBF files in safe chunked batches
  emitLog("info", `Internet connected! Synchronizing ${dbfFiles.length} database tables in secure batches...`);
  const uploadResult = await uploadDbfBatch(cloudUrl, destDir, dbfFiles, authToken, userEmail, licenseKey);

  if (uploadResult.success) {
    emitLog("success", `Cloud Sync Completed! Synchronized ${dbfFiles.length} database tables successfully.`);
    // Clear any previous queued batches since we just synced fresh data
    saveQueue([]);
    isSyncing = false;
    emitStatus({
      isSyncing: false,
      isOnline: true,
      lastStatus: "synced",
      tablesCount: dbfFiles.length,
      message: uploadResult.message
    });
    return { success: true, message: uploadResult.message, result: uploadResult };
  } else {
    emitLog("error", `Cloud upload failed: ${uploadResult.error}. Queued for retry.`);
    enqueueOfflineBatch(destDir, dbfFiles, companyCode);
    isSyncing = false;
    emitStatus({
      isSyncing: false,
      isOnline: false,
      lastStatus: "upload_failed_queued",
      error: uploadResult.error
    });
    return { success: false, message: uploadResult.error };
  }
}

// ---------------------------------------------------------------------------
// Cloud Communication Helpers (Chunked Upload & Heartbeat)
// ---------------------------------------------------------------------------
async function checkConnectivity(cloudUrl) {
  try {
    const pingUrl = `${cloudUrl}/api/mabsolcrmsync/heartbeat`;
    await axios.post(pingUrl, { status: "ping" }, { timeout: 4000 });
    return true;
  } catch (err) {
    if (err.response) return true; // Server replied with HTTP error, but internet is working
    return false;
  }
}

async function uploadDbfBatch(cloudUrl, destDir, dbfFiles, token, email, licenseKey) {
  if (dbfFiles.length === 0) {
    return { success: true, message: "No database files to upload." };
  }

  // Upload in small chunks of 4 files each to eliminate HTTP 413 Payload Too Large
  const BATCH_SIZE = 4;
  const totalBatches = Math.ceil(dbfFiles.length / BATCH_SIZE);
  let lastSuccessData = null;

  try {
    for (let b = 0; b < totalBatches; b++) {
      const batchFiles = dbfFiles.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      const isFinal = (b === totalBatches - 1);

      emitLog("info", `Syncing data package ${b + 1} of ${totalBatches}...`);

      const form = new FormData();
      form.append("isFinalBatch", isFinal ? "true" : "false");

      for (const fileName of batchFiles) {
        const filePath = path.join(destDir, fileName);
        if (fs.existsSync(filePath)) {
          form.append("files", fs.createReadStream(filePath), { filename: fileName });
        }
      }

      const headers = {
        ...form.getHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(licenseKey ? { "x-license-key": licenseKey } : {}),
        ...(email ? { "x-agent-email": email } : {})
      };

      const targetUrl = `${cloudUrl}/api/mabsolcrmsync/upload-dbf`;
      const res = await axios.post(targetUrl, form, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000
      });

      if (!res.data || !res.data.success) {
        return { success: false, error: res.data?.error || `Upload error on batch ${b + 1}` };
      }

      lastSuccessData = res.data;
    }

    return {
      success: true,
      message: lastSuccessData?.message || "All database packages synced successfully.",
      data: lastSuccessData
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    return { success: false, error: msg };
  }
}

function enqueueOfflineBatch(destDir, dbfFiles, companyCode) {
  const queue = loadQueue();
  queue.push({
    queuedAt: new Date().toISOString(),
    companyCode,
    destDir,
    dbfFiles
  });
  saveQueue(queue);
}

// ---------------------------------------------------------------------------
// Background Network Monitor & Auto-Reconnect Worker
// ---------------------------------------------------------------------------
function startNetworkWatcher() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(async () => {
    const config = loadConfig();
    const session = loadSession();
    const cloudUrl = (session?.cloudUrl || config.cloudUrl || "https://phcrm.mabsolinfotech.cloud").replace(/\/+$/, "");

    const online = await checkConnectivity(cloudUrl);
    const wasOffline = !isOnlineState;
    emitNetwork(online);

    if (online) {
      // Send heartbeat
      try {
        await axios.post(`${cloudUrl}/api/mabsolcrmsync/heartbeat`, {
          workerId: `electron-agent-${config.companyCode || "A01"}`,
          status: isSyncing ? "syncing" : "online",
          dataDir: config.destDir,
          email: session?.email || config.userEmail || ""
        }, { timeout: 5000 });
      } catch {}

      // If internet was just restored and we have queued files, auto-sync now!
      if (wasOffline && !isSyncing) {
        const queue = loadQueue();
        if (queue.length > 0) {
          emitLog("success", "Internet restored! Automatically syncing queued offline files to Cloud Database...");
          const latestBatch = queue[queue.length - 1];
          uploadDbfBatch(
            cloudUrl,
            latestBatch.destDir,
            latestBatch.dbfFiles,
            session?.token || "",
            session?.email || "",
            config.licenseKey || ""
          ).then((res) => {
            if (res.success) {
              emitLog("success", `Restored Sync Complete! ${res.message}`);
              saveQueue([]);
              emitStatus({ isOnline: true, lastStatus: "synced", message: res.message });
            }
          });
        }
      }
    }
  }, 15000);
}

function setupAutoSyncTimer(intervalMins) {
  clearInterval(syncIntervalTimer);
  const mins = Math.max(1, Number(intervalMins) || 10);
  emitLog("info", `Auto-sync schedule updated: running every ${mins} minute(s).`);
  syncIntervalTimer = setInterval(() => {
    if (!isSyncing) {
      emitLog("info", "[Auto-Schedule] Triggering scheduled sync...");
      executeDecryptionAndSync("schedule").catch(() => {});
    }
  }, mins * 60 * 1000);
}
