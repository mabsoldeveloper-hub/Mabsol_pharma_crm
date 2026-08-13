const fs = require('fs');
const path = require('path');

// Default Master Key / Fallback key if not overridden by env
const DEFAULT_MASTER_KEY = process.env.ACTIVATION_SECRET_KEY || "MABSOL-2026-PHARMA-CRM-KEY";

class LicenseManager {
  constructor(app) {
    this.userDataPath = app.getPath('userData');
    this.licenseFilePath = path.join(this.userDataPath, 'license.json');
  }

  getLicenseData() {
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        const raw = fs.readFileSync(this.licenseFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("[LicenseManager] Error reading license file:", err);
    }
    return { activated: false, key: null, activatedAt: null };
  }

  saveLicenseData(data) {
    try {
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }
      fs.writeFileSync(this.licenseFilePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error("[LicenseManager] Error saving license file:", err);
      return false;
    }
  }

  isActivated() {
    const data = this.getLicenseData();
    if (!data.activated || !data.key) {
      return false;
    }
    return this.validateKeyFormat(data.key).valid;
  }

  validateKeyFormat(key) {
    if (!key || typeof key !== 'string') {
      return { valid: false, message: "License key is empty." };
    }

    const cleanKey = key.trim().toUpperCase();

    // Check 1: Master Key match
    if (cleanKey === DEFAULT_MASTER_KEY.toUpperCase()) {
      return { valid: true, message: "Master activation key accepted." };
    }

    // Check 2: Pattern verification: MABSOL-XXXX-XXXX-XXXX
    const parts = cleanKey.split('-');
    if (parts.length === 4 && parts[0] === "MABSOL") {
      const p1 = parts[1];
      const p2 = parts[2];
      const p3 = parts[3];

      if (p1.length >= 4 && p2.length >= 4 && p3.length >= 4) {
        return { valid: true, message: "Valid product key format." };
      }
    }

    return { valid: false, message: "Invalid product activation key format." };
  }

  activate(key) {
    const check = this.validateKeyFormat(key);
    if (!check.valid) {
      return { success: false, error: check.message };
    }

    const cleanKey = key.trim().toUpperCase();
    const data = {
      activated: true,
      key: cleanKey,
      activatedAt: new Date().toISOString()
    };

    const saved = this.saveLicenseData(data);
    if (!saved) {
      return { success: false, error: "Failed to write license file on system." };
    }

    return { success: true, message: "Application activated successfully!" };
  }

  resetLicense() {
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        fs.unlinkSync(this.licenseFilePath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = LicenseManager;
