// DOM Elements - Views
const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const loginStep = document.getElementById("loginStep");
const otpStep = document.getElementById("otpStep");

// DOM Elements - Forms & Inputs
const loginForm = document.getElementById("loginForm");
const cloudUrlInput = document.getElementById("cloudUrlInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const otpForm = document.getElementById("otpForm");
const otpCodeInput = document.getElementById("otpCodeInput");
const otpTargetEmail = document.getElementById("otpTargetEmail");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const otpError = document.getElementById("otpError");

// DOM Elements - Top Nav & Status
const netStatusBadge = document.getElementById("netStatusBadge");
const navUserInitial = document.getElementById("navUserInitial");
const navUserName = document.getElementById("navUserName");
const logoutBtn = document.getElementById("logoutBtn");

// DOM Elements - Config Form
const configForm = document.getElementById("configForm");
const companyNameInput = document.getElementById("companyNameInput");
const companyCodeInput = document.getElementById("companyCodeInput");
const sourceDirInput = document.getElementById("sourceDirInput");
const destDirInput = document.getElementById("destDirInput");
const licenseKeyInput = document.getElementById("licenseKeyInput");
const intervalSelect = document.getElementById("intervalSelect");
const browseSourceBtn = document.getElementById("browseSourceBtn");
const browseDestBtn = document.getElementById("browseDestBtn");
const editConfigBtn = document.getElementById("editConfigBtn");
const saveConfigBtn = document.getElementById("saveConfigBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveNotice = document.getElementById("saveNotice");

// DOM Elements - Unlock Modal
const unlockModal = document.getElementById("unlockModal");
const unlockModalEmail = document.getElementById("unlockModalEmail");
const unlockOtpForm = document.getElementById("unlockOtpForm");
const unlockOtpInput = document.getElementById("unlockOtpInput");
const unlockOtpError = document.getElementById("unlockOtpError");
const verifyUnlockBtn = document.getElementById("verifyUnlockBtn");
const closeUnlockModalBtn = document.getElementById("closeUnlockModalBtn");

// DOM Elements - Action & Stats & Terminal
const syncNowBtn = document.getElementById("syncNowBtn");
const statTablesCount = document.getElementById("statTablesCount");
const statQueuedCount = document.getElementById("statQueuedCount");
const statLastStatus = document.getElementById("statLastStatus");
const terminalBody = document.getElementById("terminalBody");
const clearLogBtn = document.getElementById("clearLogBtn");

let currentAuthEmail = "";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  setupIpcListeners();

  // Check existing session
  try {
    const sessionRes = await window.electronAPI.checkSession();
    if (sessionRes && sessionRes.authenticated && sessionRes.session) {
      currentAuthEmail = sessionRes.session.email || "";
      showDashboard(sessionRes.session);
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
});

function showLogin() {
  authView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  loginStep.classList.remove("hidden");
  otpStep.classList.add("hidden");
}

async function showDashboard(session) {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");

  // Populate user pill
  const userName = session.user?.name || session.email || "Operator";
  navUserName.textContent = userName;
  navUserInitial.textContent = userName.charAt(0).toUpperCase();
  currentAuthEmail = session.email || "";

  // Load configuration
  await loadAndDisplayConfig();

  // Load sync status
  try {
    const status = await window.electronAPI.getSyncStatus();
    updateStatusDisplay(status);
  } catch {}
}

async function loadAndDisplayConfig() {
  try {
    const cfg = await window.electronAPI.getConfig();
    if (cfg) {
      if (cfg.cloudUrl) cloudUrlInput.value = cfg.cloudUrl;
      companyNameInput.value = cfg.companyName || "";
      companyCodeInput.value = (cfg.companyCode || "A01").toUpperCase();
      sourceDirInput.value = cfg.sourceDir || "";
      destDirInput.value = cfg.destDir || "";
      licenseKeyInput.value = cfg.licenseKey || "";
      intervalSelect.value = String(cfg.intervalMins || 10);

      // If configuration already has data saved, lock the form by default
      const hasConfig = Boolean(cfg.companyName || cfg.sourceDir || cfg.licenseKey);
      setFormLocked(hasConfig);
    }
  } catch (err) {
    console.error("Failed to load config:", err);
  }
}

function setFormLocked(isLocked) {
  companyNameInput.disabled = isLocked;
  companyCodeInput.disabled = isLocked;
  sourceDirInput.disabled = isLocked;
  destDirInput.disabled = isLocked;
  licenseKeyInput.disabled = isLocked;
  intervalSelect.disabled = isLocked;
  browseSourceBtn.disabled = isLocked;
  browseDestBtn.disabled = isLocked;

  if (isLocked) {
    editConfigBtn.classList.remove("hidden");
    saveConfigBtn.classList.add("hidden");
    cancelEditBtn.classList.add("hidden");
  } else {
    editConfigBtn.classList.add("hidden");
    saveConfigBtn.classList.remove("hidden");
    cancelEditBtn.classList.remove("hidden");
  }
}

// ---------------------------------------------------------------------------
// Event Listeners: Forms & Buttons
// ---------------------------------------------------------------------------
function setupEventListeners() {
  // Disable right-click inspect context menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // Login Form Submit (Step 1)
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    setButtonLoading(loginBtn, true);

    const cloudUrl = cloudUrlInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const res = await window.electronAPI.login({ cloudUrl, email, password });
      setButtonLoading(loginBtn, false);

      if (res.success && res.otpRequired) {
        currentAuthEmail = res.email || email;
        otpTargetEmail.textContent = currentAuthEmail;
        loginStep.classList.add("hidden");
        otpStep.classList.remove("hidden");
        otpCodeInput.value = "";
        otpCodeInput.focus();
      } else {
        loginError.textContent = res.message || "Login failed. Check your internet connection.";
        loginError.classList.remove("hidden");
      }
    } catch (err) {
      setButtonLoading(loginBtn, false);
      loginError.textContent = err.message || "Network error. Please check server URL.";
      loginError.classList.remove("hidden");
    }
  });

  // Back to Login Step
  backToLoginBtn.addEventListener("click", () => {
    otpStep.classList.add("hidden");
    loginStep.classList.remove("hidden");
    otpError.classList.add("hidden");
  });

  // OTP Verification Form Submit (Step 2)
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    otpError.classList.add("hidden");
    setButtonLoading(verifyOtpBtn, true);

    const cloudUrl = cloudUrlInput.value.trim();
    const otp = otpCodeInput.value.trim();

    try {
      const res = await window.electronAPI.verifyOtp({
        cloudUrl,
        email: currentAuthEmail,
        otp
      });
      setButtonLoading(verifyOtpBtn, false);

      if (res.success && res.session) {
        showDashboard(res.session);
      } else {
        otpError.textContent = res.message || "Invalid or expired OTP code.";
        otpError.classList.remove("hidden");
      }
    } catch (err) {
      setButtonLoading(verifyOtpBtn, false);
      otpError.textContent = err.message || "Verification failed.";
      otpError.classList.remove("hidden");
    }
  });

  // Logout
  logoutBtn.addEventListener("click", async () => {
    await window.electronAPI.logout();
    showLogin();
  });

  // Browse Source Folder
  browseSourceBtn.addEventListener("click", async () => {
    const selected = await window.electronAPI.selectFolder("Select Encrypted Data Folder");
    if (selected) sourceDirInput.value = selected;
  });

  // Browse Destination Folder
  browseDestBtn.addEventListener("click", async () => {
    const selected = await window.electronAPI.selectFolder("Select Output Data Folder");
    if (selected) destDirInput.value = selected;
  });

  // Click "Edit Configuration" -> Triggers OTP verification to unlock!
  editConfigBtn.addEventListener("click", async () => {
    editConfigBtn.disabled = true;
    unlockModalEmail.textContent = currentAuthEmail || "your registered email";
    unlockOtpError.classList.add("hidden");
    unlockOtpInput.value = "";

    try {
      const res = await window.electronAPI.sendEditOtp();
      editConfigBtn.disabled = false;

      if (res && res.success) {
        if (res.email) unlockModalEmail.textContent = res.email;
        unlockModal.classList.remove("hidden");
        unlockOtpInput.focus();
      } else {
        alert(res?.message || "Failed to send security verification code. Please check your internet connection.");
      }
    } catch (err) {
      editConfigBtn.disabled = false;
      alert("Error requesting verification code: " + err.message);
    }
  });

  // Close Unlock Modal
  closeUnlockModalBtn.addEventListener("click", () => {
    unlockModal.classList.add("hidden");
  });

  // Submit Unlock OTP Form
  unlockOtpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    unlockOtpError.classList.add("hidden");
    setButtonLoading(verifyUnlockBtn, true);

    const otp = unlockOtpInput.value.trim();

    try {
      const res = await window.electronAPI.verifyEditOtp({ otp });
      setButtonLoading(verifyUnlockBtn, false);

      if (res && res.success) {
        unlockModal.classList.add("hidden");
        setFormLocked(false); // Unlocks form fields!
      } else {
        unlockOtpError.textContent = res?.message || "Invalid or expired security code.";
        unlockOtpError.classList.remove("hidden");
      }
    } catch (err) {
      setButtonLoading(verifyUnlockBtn, false);
      unlockOtpError.textContent = err.message || "Verification failed.";
      unlockOtpError.classList.remove("hidden");
    }
  });

  // Cancel Edit Button
  cancelEditBtn.addEventListener("click", async () => {
    await loadAndDisplayConfig();
    setFormLocked(true);
  });

  // Save Config
  configForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newCfg = {
      companyName: companyNameInput.value.trim(),
      companyCode: companyCodeInput.value.trim().toUpperCase(),
      sourceDir: sourceDirInput.value.trim(),
      destDir: destDirInput.value.trim(),
      licenseKey: licenseKeyInput.value.trim(),
      autoSync: intervalSelect.value !== "0",
      intervalMins: Number(intervalSelect.value) || 10,
      cloudUrl: cloudUrlInput.value.trim()
    };

    const res = await window.electronAPI.saveConfig(newCfg);
    if (res.success) {
      saveNotice.classList.remove("hidden");
      setTimeout(() => saveNotice.classList.add("hidden"), 3000);
      setFormLocked(true); // Re-locks after save!
    }
  });

  // Decrypt & Sync Now Action
  syncNowBtn.addEventListener("click", async () => {
    setSyncButtonLoading(true);
    try {
      const res = await window.electronAPI.startSync();
      if (!res.success) {
        statLastStatus.textContent = "Error";
        statLastStatus.style.color = "#f87171";
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncButtonLoading(false);
    }
  });

  // Clear Log Console
  clearLogBtn.addEventListener("click", () => {
    terminalBody.innerHTML = "";
  });
}

// ---------------------------------------------------------------------------
// IPC Event Listeners from Main Process
// ---------------------------------------------------------------------------
function setupIpcListeners() {
  // Real-time terminal log entries
  window.electronAPI.onSyncLog(({ timestamp, level, message }) => {
    appendLog(timestamp, level, message);
  });

  // Sync status updates
  window.electronAPI.onStatusChange((status) => {
    updateStatusDisplay(status);
  });

  // Network online/offline status updates
  window.electronAPI.onNetworkChange(({ isOnline }) => {
    updateNetworkBadge(isOnline);
  });
}

// ---------------------------------------------------------------------------
// UI Helpers
// ---------------------------------------------------------------------------
function appendLog(timestamp, level, message) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${level}`;
  entry.innerHTML = `<span class="time">[${timestamp}]</span> ${escapeHtml(message)}`;
  terminalBody.appendChild(entry);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function updateStatusDisplay(status) {
  if (!status) return;

  if (typeof status.tablesCount === "number") {
    statTablesCount.textContent = status.tablesCount;
  }
  if (typeof status.queuedBatches === "number") {
    statQueuedCount.textContent = status.queuedBatches;
  }

  if (status.isSyncing) {
    statLastStatus.textContent = "Syncing...";
    statLastStatus.style.color = "#38bdf8";
  } else if (status.lastStatus === "synced") {
    statLastStatus.textContent = "Synced (Cloud)";
    statLastStatus.style.color = "#34d399";
  } else if (status.lastStatus === "offline_queued") {
    statLastStatus.textContent = "Offline (Queued)";
    statLastStatus.style.color = "#fbbf24";
  } else if (status.error) {
    statLastStatus.textContent = "Failed";
    statLastStatus.style.color = "#f87171";
  }

  if (typeof status.isOnline === "boolean") {
    updateNetworkBadge(status.isOnline);
  }
}

function updateNetworkBadge(isOnline) {
  if (isOnline) {
    netStatusBadge.className = "status-pill online";
    netStatusBadge.querySelector(".label").textContent = "Online";
  } else {
    netStatusBadge.className = "status-pill offline";
    netStatusBadge.querySelector(".label").textContent = "Offline";
  }
}

function setButtonLoading(btn, isLoading) {
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".spinner");
  btn.disabled = isLoading;
  if (isLoading) {
    text.classList.add("hidden");
    spinner.classList.remove("hidden");
  } else {
    text.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
}

function setSyncButtonLoading(isLoading) {
  const content = syncNowBtn.querySelector(".sync-btn-content");
  const spinner = syncNowBtn.querySelector(".spinner-large");
  syncNowBtn.disabled = isLoading;
  if (isLoading) {
    content.classList.add("hidden");
    spinner.classList.remove("hidden");
  } else {
    content.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
