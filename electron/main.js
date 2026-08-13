const { app, BrowserWindow, ipcMain, Menu, dialog, session, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const LicenseManager = require('./licenseManager');

const PROTOCOL_PREFIX = 'mabsolcrm';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_PREFIX, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;
const CLOUD_SSO_URL = process.env.CLOUD_SSO_URL || `https://phcrm.mabsolinfotech.cloud/auth/desktop-sso`;

// ─── Load .env from app root ──────────────────────────────────────────────────
const APP_ROOT_EARLY = isDev
  ? path.join(__dirname, '..')
  : path.join(process.resourcesPath, 'app.asar.unpacked');

const envPath = path.join(APP_ROOT_EARLY, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const APP_ROOT = isDev
  ? path.join(__dirname, '..')
  : path.join(process.resourcesPath, 'app.asar.unpacked');

// ─── Crash Logger ────────────────────────────────────────────────────────────
let logFilePath = null;
function initLogger() {
  try {
    const logDir = app.getPath('userData');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    logFilePath = path.join(logDir, 'app.log');
    try {
      const stat = fs.statSync(logFilePath);
      if (stat.size > 200 * 1024) fs.writeFileSync(logFilePath, '');
    } catch (_) {}

    const origError = console.error;
    console.error = function (...args) {
      log('[console.error]', ...args);
      origError.apply(console, args);
    };
  } catch (_) {}
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  if (logFilePath) {
    try { fs.appendFileSync(logFilePath, line); } catch (_) {}
  }
}

process.on('uncaughtException', (err) => {
  log('[CRASH] uncaughtException:', err && err.stack ? err.stack : String(err));
  try {
    dialog.showErrorBox('Application Error', `An unexpected error occurred:\n\n${err.message}\n\nLog: ${logFilePath}`);
  } catch (_) {}
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  log('[CRASH] unhandledRejection:', reason instanceof Error ? reason.stack : String(reason));
});

let mainWindow = null;
let splashWindow = null;
let activationWindow = null;
let licenseManager = null;
let nextApp = null;
let httpServer = null;

// Deep Link Handling (Windows)
function handleDeepLinkUrl(urlStr) {
  try {
    log('[Electron] Deep link received:', urlStr);
    if (!urlStr || typeof urlStr !== 'string') return;
    if (!urlStr.startsWith('mabsolcrm://')) return;

    const parsedUrl = new URL(urlStr);
    const token = parsedUrl.searchParams.get('token');
    const username = parsedUrl.searchParams.get('user') || 'User';

    if (token) {
      log('[Electron] SSO token extracted successfully from browser redirect!');
      licenseManager.activate('MABSOL-SSO-ACTIVATED-KEY');

      session.defaultSession.cookies.set({
        url: SERVER_URL,
        name: 'token',
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
      }).then(() => {
        log('[Electron] Cookie set from deep link SSO!');

        if (activationWindow && !activationWindow.isDestroyed()) {
          activationWindow.webContents.send('sso-completed', { user: username });
          setTimeout(() => {
            if (activationWindow) activationWindow.close();
            launchAppFlow();
          }, 1200);
        } else if (!mainWindow) {
          launchAppFlow();
        } else if (mainWindow) {
          mainWindow.loadURL(`${SERVER_URL}/dashboard`);
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });
    }
  } catch (err) {
    log('[Electron] Error handling deep link URL:', err.message);
  }
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    log('[Electron] Second instance triggered with args:', JSON.stringify(commandLine));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const deepLinkArg = commandLine.find(arg => arg.startsWith('mabsolcrm://'));
    if (deepLinkArg) {
      handleDeepLinkUrl(deepLinkArg);
    }
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const splashHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #f8fafc; font-family: 'Segoe UI', sans-serif;
    display: flex; align-items: center; justify-content: center;
    height: 100vh; flex-direction: column; gap: 20px;
    -webkit-app-region: drag;
  }
  .badge {
    width: 72px; height: 72px; background: linear-gradient(135deg,#3b82f6,#1d4ed8);
    border-radius: 20px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(59,130,246,0.4);
  }
  .badge svg { width:38px; height:38px; fill:#fff; }
  h1 { font-size:20px; font-weight:700; }
  p { font-size:13px; color:#94a3b8; }
  .dots span {
    display:inline-block; width:8px; height:8px; border-radius:50%;
    background:#3b82f6; margin:0 3px; animation: bounce 1.2s infinite ease-in-out;
  }
  .dots span:nth-child(2) { animation-delay:0.2s; }
  .dots span:nth-child(3) { animation-delay:0.4s; }
  @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.5} 40%{transform:scale(1);opacity:1} }
</style>
</head>
<body>
  <div class="badge">
    <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
  </div>
  <h1>Mabsol Pharma CRM</h1>
  <p>Verifying authentication & launching desktop dashboard...</p>
  <div class="dots"><span></span><span></span><span></span></div>
</body>
</html>`;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
  log('[Electron] Splash window shown.');
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

function createActivationWindow() {
  activationWindow = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: false,
    maximizable: false,
    center: true,
    title: 'Mabsol Pharma CRM - Desktop Sign In',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  activationWindow.loadFile(path.join(__dirname, 'activation.html'));
  log('[Electron] Activation key window opened.');

  activationWindow.on('closed', () => {
    activationWindow = null;
    if (!licenseManager.isActivated() && !mainWindow) {
      log('[Electron] Login window closed without authenticating. Quitting.');
      app.quit();
    }
  });
}

function performDesktopAutoLogin() {
  return new Promise((resolve) => {
    try {
      const licenseData = licenseManager.getLicenseData();
      const postData = JSON.stringify({
        key: licenseData.key || "MABSOL-2026-PHARMA-CRM-KEY",
        secret: process.env.ACTIVATION_SECRET_KEY || "MABSOL-2026-PHARMA-CRM-KEY"
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/desktop-login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const setCookie = res.headers['set-cookie'];
            if (setCookie && setCookie.length > 0) {
              for (const cookieStr of setCookie) {
                const tokenMatch = cookieStr.match(/token=([^;]+)/);
                if (tokenMatch) {
                  const tokenValue = tokenMatch[1];
                  session.defaultSession.cookies.set({
                    url: SERVER_URL,
                    name: 'token',
                    value: tokenValue,
                    httpOnly: true,
                    sameSite: 'lax',
                    expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
                  }).then(() => {
                    log('[Electron] Desktop session cookie set successfully.');
                    resolve(true);
                  }).catch((err) => {
                    log('[Electron] Error setting desktop session cookie:', err.message);
                    resolve(false);
                  });
                  return;
                }
              }
            }
          } catch (err) {
            log('[Electron] Failed to parse desktop auto-login response:', err.message);
          }
          resolve(false);
        });
      });

      req.on('error', (err) => {
        log('[Electron] Desktop auto-login HTTP request error:', err.message);
        resolve(false);
      });

      req.write(postData);
      req.end();
    } catch (err) {
      log('[Electron] Desktop auto-login exception:', err.message);
      resolve(false);
    }
  });
}

function createMainWindow() {
  let iconPath;
  try {
    iconPath = isDev
      ? path.join(__dirname, '../public/mabsol_logo.ico')
      : path.join(process.resourcesPath, 'public', 'mabsol_logo.ico');
  } catch (_) {
    iconPath = undefined;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    center: true,
    title: 'Mabsol Pharma CRM',
    icon: iconPath,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { type: 'separator' },
        {
          label: 'Sign Out / Change Account',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Sign Out'],
              defaultId: 0,
              title: 'Sign Out Desktop App',
              message: 'Are you sure you want to sign out and return to browser authentication?'
            }).then(({ response }) => {
              if (response === 1) {
                licenseManager.resetLicense();
                session.defaultSession.clearStorageData().then(() => {
                  app.relaunch();
                  app.exit();
                });
              }
            });
          }
        },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  performDesktopAutoLogin().then(() => {
    mainWindow.loadURL(`${SERVER_URL}/dashboard`).catch((err) => {
      log('[Electron] Failed to load dashboard URL:', err.message);
    });
  });

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow.show();
    log('[Electron] Main window shown (Dashboard loaded directly).');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function checkServerReady(url, timeoutMs = 90000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      http.get(url, (res) => {
        if (res.statusCode < 500) {
          clearInterval(interval);
          resolve(true);
        }
        res.resume();
      }).on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Server did not respond within ${timeoutMs / 1000}s`));
        }
      });
    }, 600);
  });
}

function startNextServer() {
  if (isDev) {
    log('[Electron] Dev mode — waiting for server on', SERVER_URL);
    return checkServerReady(SERVER_URL);
  }

  return new Promise((resolve, reject) => {
    try {
      log('[Electron] APP_ROOT:', APP_ROOT);
      log('[Electron] Starting embedded Next.js server on port', PORT);

      const nextModulePath = path.join(APP_ROOT, 'node_modules', 'next');
      log('[Electron] next module path:', nextModulePath);

      if (!fs.existsSync(nextModulePath)) {
        return reject(new Error(`next module not found at: ${nextModulePath}`));
      }

      const next = require(nextModulePath);
      nextApp = next({ dev: false, dir: APP_ROOT });
      const handle = nextApp.getRequestHandler();

      nextApp.prepare()
        .then(() => {
          httpServer = http.createServer((req, res) => handle(req, res));

          httpServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              log('[Electron] Port', PORT, 'in use, trying to use existing server...');
              checkServerReady(SERVER_URL, 10000).then(resolve).catch(reject);
            } else {
              reject(err);
            }
          });

          httpServer.listen(PORT, '127.0.0.1', () => {
            log(`[Electron] Next.js server ready at ${SERVER_URL}`);
            resolve();
          });
        })
        .catch((err) => {
          log('[Electron] nextApp.prepare() failed:', err.stack || err.message);
          reject(err);
        });
    } catch (err) {
      log('[Electron] startNextServer() threw:', err.stack || err.message);
      reject(err);
    }
  });
}

function launchAppFlow() {
  createSplashWindow();

  startNextServer()
    .then(() => {
      createMainWindow();
    })
    .catch((err) => {
      log('[Electron] Server startup failed:', err.stack || err.message);
      closeSplash();
      dialog.showErrorBox(
        'Startup Failed',
        `Mabsol Pharma CRM could not start the internal server.\n\n` +
        `Error: ${err.message}\n\n` +
        `Log file: ${logFilePath}`
      );
      app.quit();
    });
}

app.whenReady().then(() => {
  initLogger();
  log('[Electron] App ready. isDev:', isDev, '| APP_ROOT:', APP_ROOT);

  licenseManager = new LicenseManager(app);

  // Register open-browser-sso handler
  ipcMain.handle('open-browser-sso', () => {
    const targetUrl = isDev ? `http://localhost:${PORT}/auth/desktop-sso` : CLOUD_SSO_URL;
    log('[Electron] Opening browser SSO URL:', targetUrl);
    shell.openExternal(targetUrl);
    return { success: true };
  });

  ipcMain.handle('activate-key', (event, key) => {
    log('[Electron] activate-key called with key:', key ? key.substring(0, 6) + '...' : 'empty');
    const result = licenseManager.activate(key);
    if (result.success) {
      setTimeout(() => {
        if (activationWindow) activationWindow.close();
        launchAppFlow();
      }, 500);
    }
    return result;
  });

  ipcMain.handle('get-license-status', () => {
    return {
      activated: licenseManager.isActivated(),
      data: licenseManager.getLicenseData()
    };
  });

  // Check initial launch args for deep link URL
  const initialUrlArg = process.argv.find(arg => arg.startsWith('mabsolcrm://'));
  if (initialUrlArg) {
    handleDeepLinkUrl(initialUrlArg);
  } else if (licenseManager.isActivated()) {
    log('[Electron] License already activated. Launching app directly to Dashboard...');
    launchAppFlow();
  } else {
    log('[Electron] Not activated. Showing SSO / Activation window.');
    createActivationWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    log('[Electron] All windows closed. Quitting.');
    app.quit();
  }
});

app.on('will-quit', () => {
  if (httpServer) {
    log('[Electron] Closing HTTP server...');
    httpServer.close();
  }
});
