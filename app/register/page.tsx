"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./register.css";
import { validateName, validateEmail, validateMobile, validatePassword } from "@/lib/constants/validation.constant";


const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});



interface AdditionalGstItem {
  id: string;
  gstNo: string;
  state: string;
  stateCode: string;
  verified: boolean;
  address: string;
  city: string;
  pincode: string;
  isVerifying?: boolean;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function RegisterPage() {
  const router = useRouter();

  // Wizard Steps: 1 = Company & GST, 2 = Admin Profile & OTPs, 3 = Review & Launch
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Modern Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ---------- STEP 1: Company & GST Master ----------
  const [companyName, setCompanyName] = useState("");
  const [primaryGst, setPrimaryGst] = useState("");
  const [isPrimaryGstVerified, setIsPrimaryGstVerified] = useState(false);
  const [isVerifyingPrimaryGst, setIsVerifyingPrimaryGst] = useState(false);
  const [gstVerifyMessage, setGstVerifyMessage] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [drugLicenseNo, setDrugLicenseNo] = useState("");

  // Multi-GST branch additions
  const [additionalGsts, setAdditionalGsts] = useState<AdditionalGstItem[]>([]);

  // ---------- STEP 2: User Profile & Security ----------
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Managing Director");

  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  const [mobile, setMobile] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileSending, setMobileSending] = useState(false);
  const [mobileVerifying, setMobileVerifying] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ---------- GENERAL STATE ----------
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // ==========================================
  // REAL GST VERIFICATION HANDLER (VIA API)
  // ==========================================
  async function handleVerifyPrimaryGst() {
    const cleanGst = primaryGst.trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      showToast("Please enter a 15-character GSTIN (e.g. 06AALCM8009M1Z1)", "error");
      return;
    }

    setIsVerifyingPrimaryGst(true);
    setGstVerifyMessage(null);

    try {
      const res = await fetch("/api/auth/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: cleanGst }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        setIsPrimaryGstVerified(true);
        setPrimaryGst(d.gstin || cleanGst);

        // Auto-fill real company name from live GST API
        if (d.businessName || d.legalName || d.tradeName) {
          setCompanyName(d.businessName || d.legalName || d.tradeName);
        }

        // Auto-fill state, city, address, PIN
        const resolvedState = d.state || d.stateName || "";
        if (resolvedState) setState(resolvedState);
        if (d.city) setCity(d.city);
        if (d.address) setAddress(d.address);
        if (d.pincode) setPincode(d.pincode);

        const displayName = d.businessName || d.legalName || d.tradeName;
        const statusLabel = displayName
          ? `✓ Verified: ${displayName}`
          : resolvedState
          ? `✓ Verified: ${resolvedState}`
          : `✓ GSTIN Verified`;

        setGstVerifyMessage(statusLabel);
        showToast(statusLabel, "success");
      } else {
        setIsPrimaryGstVerified(false);
        const err = json.message || "GST verification failed from API";
        setGstVerifyMessage(err);
        showToast(err, "error");
      }
    } catch {
      setIsPrimaryGstVerified(false);
      setGstVerifyMessage("Unable to verify GSTIN. Please check connection.");
      showToast("Network error connecting to GST service", "error");
    } finally {
      setIsVerifyingPrimaryGst(false);
    }
  }

  // Auto Postal PIN lookup for City/State
  async function handlePincodeBlur() {
    if (!pincode || pincode.trim().length !== 6) return;
    try {
      const res = await fetch("/api/auth/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pincode.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (!city && json.data.city) setCity(json.data.city);
        if (!state && json.data.state) setState(json.data.state);
        showToast(`Postal PIN resolved: ${json.data.city || ""}, ${json.data.state || ""}`, "info");
      }
    } catch {
      // Ignore
    }
  }

  // Multi-GST Handlers
  function handleAddAdditionalGst() {
    const newId = `gst_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setAdditionalGsts([
      ...additionalGsts,
      {
        id: newId,
        gstNo: "",
        state: "",
        stateCode: "",
        verified: false,
        address: "",
        city: "",
        pincode: "",
      },
    ]);
    showToast("Added new GST branch row", "info");
  }

  function handleRemoveAdditionalGst(id: string) {
    setAdditionalGsts(additionalGsts.filter((item) => item.id !== id));
  }

  async function handleVerifyAdditionalGst(index: number) {
    const item = additionalGsts[index];
    const cleanGst = item.gstNo.trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      showToast("Please enter a 15-character GSTIN", "error");
      return;
    }

    const updated = [...additionalGsts];
    updated[index].isVerifying = true;
    setAdditionalGsts(updated);

    try {
      const res = await fetch("/api/auth/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: cleanGst }),
      });
      const json = await res.json();

      const nextList = [...additionalGsts];
      nextList[index].isVerifying = false;

      if (json.success && json.data) {
        const d = json.data;
        nextList[index].verified = true;
        const branchState = d.state || d.stateName || "";
        nextList[index].state = branchState;
        nextList[index].stateCode = d.stateCode || "";
        nextList[index].city = d.city || "";
        nextList[index].address = d.address || "";
        nextList[index].pincode = d.pincode || "";
        setAdditionalGsts(nextList);
        showToast(branchState ? `✓ Branch GST verified for ${branchState}!` : "✓ Branch GST verified!", "success");
      } else {
        setAdditionalGsts(nextList);
        showToast(json.message || "Failed to verify branch GSTIN", "error");
      }
    } catch {
      const nextList = [...additionalGsts];
      nextList[index].isVerifying = false;
      setAdditionalGsts(nextList);
      showToast("Network error verifying branch GST", "error");
    }
  }

  // ==========================================
  // OTP SEND & VERIFY HANDLERS
  // ==========================================
  async function handleSendEmailOtp() {
    if (emailSending) return;
    if (!email || !EMAIL_RE.test(email.trim())) {
      showToast("Please enter a valid work email address", "error");
      return;
    }

    setEmailSending(true);
    try {
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (json.success) {
        setEmailOtpSent(true);
        showToast("Verification code sent to your email!", "success");
      } else {
        showToast(json.message || "Failed to send email OTP", "error");
      }
    } catch {
      showToast("Network error sending OTP. Please check connection.", "error");
    } finally {
      setEmailSending(false);
    }
  }

  async function handleVerifyEmailOtp() {
    if (emailVerifying || !emailOtp) return;
    setEmailVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: emailOtp.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setEmailVerified(true);
        setEmailOtpSent(false);
        showToast("Email verified successfully!", "success");
      } else {
        showToast(json.message || "Incorrect email verification code", "error");
      }
    } catch {
      showToast("Verification failed", "error");
    } finally {
      setEmailVerifying(false);
    }
  }

  async function handleSendMobileOtp() {
    if (mobileSending) return;
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number", "error");
      return;
    }

    setMobileSending(true);
    try {
      const res = await fetch("/api/auth/send-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanMobile }),
      });
      const json = await res.json();
      if (json.success) {
        setMobileOtpSent(true);
        if (json.deliveredLive) {
          showToast(`Verification code sent to +91 ${cleanMobile}`, "success");
        } else if (json.otp) {
          setMobileOtp(json.otp);
          showToast(`OTP: ${json.otp} (Auto-filled for instant testing)`, "info");
        } else {
          showToast(`Verification code sent to +91 ${cleanMobile}`, "success");
        }
      } else {
        showToast(json.message || "Failed to send WhatsApp OTP", "error");
      }
    } catch {
      showToast("Failed to send WhatsApp OTP", "error");
    } finally {
      setMobileSending(false);
    }
  }

  async function handleVerifyMobileOtp() {
    if (mobileVerifying || !mobileOtp) return;
    setMobileVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim(), otp: mobileOtp.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setMobileVerified(true);
        setMobileOtpSent(false);
        showToast("Mobile verified successfully!", "success");
      } else {
        showToast(json.message || "Incorrect verification code", "error");
      }
    } catch {
      showToast("Verification failed", "error");
    } finally {
      setMobileVerifying(false);
    }
  }

  // ==========================================
  // STEP TRANSITIONS & SUBMISSION
  // ==========================================
  function goToNextStep() {
    setErrorBanner(null);

    if (currentStep === 1) {
      if (!companyName.trim()) {
        const msg = "Company / Legal enterprise name is required";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      if (companyName.trim().length > 120) {
        const msg = "Company name is too long (max 120 characters)";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      setCurrentStep(2);
      showToast("Company details saved. Now enter admin details.", "info");
    } else if (currentStep === 2) {
      // Validate full name
      const nameErr = validateName(name);
      if (nameErr) {
        setErrorBanner(nameErr);
        showToast(nameErr, "error");
        return;
      }
      // Validate email before checking verified
      const emailErr = validateEmail(email);
      if (emailErr) {
        setErrorBanner(emailErr);
        showToast(emailErr, "error");
        return;
      }
      if (!emailVerified) {
        const msg = "Please verify your work email with the OTP before continuing";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      // Validate mobile
      const mobileErr = validateMobile(mobile);
      if (mobileErr) {
        setErrorBanner(mobileErr);
        showToast(mobileErr, "error");
        return;
      }
      if (!mobileVerified) {
        const msg = "Please verify your mobile number with the OTP before continuing";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      // Validate password
      const passwordErr = validatePassword(password);
      if (passwordErr) {
        setErrorBanner(passwordErr);
        showToast(passwordErr, "error");
        return;
      }
      if (password !== confirmPassword) {
        const msg = "Passwords do not match. Please re-enter.";
        setErrorBanner(msg);
        showToast(msg, "error");
        return;
      }
      setCurrentStep(3);
      showToast("Security verified! Please review your details.", "info");
    }
  }

  // Final Registration Submission
  async function handleCompleteRegistration() {
    if (loading) return;
    setLoading(true);
    setErrorBanner(null);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.replace(/\D/g, ""), // digits only
        password,
        designation,
        role: "Admin",
        companyName: companyName.trim(),
        gstNo: primaryGst.trim().toUpperCase(),
        drugLicenseNo: drugLicenseNo.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        additionalGstins: additionalGsts.filter((g) => g.gstNo.trim().length === 15),
        businessType: "pharma_enterprise",
        financialYearName: "2025-26",
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        showToast("🎉 Workspace created successfully! Redirecting to login...", "success");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setErrorBanner(json.message || "Registration failed. Please try again.");
        showToast(json.message || "Registration failed", "error");
      }
    } catch {
      setErrorBanner("An unexpected error occurred while setting up your workspace.");
      showToast("An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`clean-signup-page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      {/* Floating Modern Toast Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <span className="toast-icon-circle">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Background Soft Glow Ambience */}
      <div className="bg-glow bg-glow-top" />
      <div className="bg-glow bg-glow-bottom" />

      <div className="clean-signup-container">
        {/* ========================================================
            MAIN CLEAN ONBOARDING WIZARD CARD (SPACIOUS 900PX PC WIDTH)
           ======================================================== */}
        <div className="clean-wizard-card">
          {/* Brand Header */}
          <div className="brand-header">
            <div className="brand-mark-box">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="cleanBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffb347" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                <path
                  d="M16 2.5 L28 9.5 L28 22.5 L16 29.5 L4 22.5 L4 9.5 Z"
                  stroke="url(#cleanBrandGrad)"
                  strokeWidth="2.2"
                  fill="rgba(249, 115, 22, 0.12)"
                />
                <path
                  d="M13.5 8 H18.5 V13.5 H24 V18.5 H18.5 V24 H13.5 V18.5 H8 V13.5 H13.5 Z"
                  fill="url(#cleanBrandGrad)"
                />
                <circle cx="16" cy="16" r="2.8" fill="#ffffff" />
              </svg>
            </div>
            <div className="brand-text-col">
              <span className="brand-name">Mabsol Pharma CRM</span>
              <span className="brand-tagline">Pharmaceutical Enterprise Onboarding</span>
            </div>
          </div>

          <div className="wizard-heading-box">
            <h1>Create Your Pharma Account</h1>
            <p className="wizard-subtext">
              Set up your company, verify GSTINs with live government verification, and launch your pharma CRM workspace.
            </p>
          </div>

          {/* Streamlined Step Progress Bar */}
          <div className="clean-step-tracker">
            <button
              type="button"
              className={`step-btn ${currentStep === 1 ? "active" : currentStep > 1 ? "completed" : ""}`}
              onClick={() => setCurrentStep(1)}
            >
              <span className="step-num">{currentStep > 1 ? "✓" : "1"}</span>
              <span className="step-txt">Company &amp; GST</span>
            </button>
            <div className={`step-line ${currentStep > 1 ? "filled" : ""}`} />

            <button
              type="button"
              className={`step-btn ${currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""}`}
              onClick={() => { if (companyName) setCurrentStep(2); }}
            >
              <span className="step-num">{currentStep > 2 ? "✓" : "2"}</span>
              <span className="step-txt">Admin Profile &amp; OTP</span>
            </button>
            <div className={`step-line ${currentStep > 2 ? "filled" : ""}`} />

            <button
              type="button"
              className={`step-btn ${currentStep === 3 ? "active" : ""}`}
              onClick={() => { if (emailVerified && mobileVerified) setCurrentStep(3); }}
            >
              <span className="step-num">3</span>
              <span className="step-txt">Review &amp; Launch</span>
            </button>
          </div>

          {errorBanner && <div className="clean-error-banner">{errorBanner}</div>}

          {/* ========================================================
              STEP 1: COMPANY & GST MASTER
             ======================================================== */}
          {currentStep === 1 && (
            <div className="clean-form-module">
              {/* Primary GSTIN Verification */}
              <div className="clean-field">
                <label>
                  <span>Primary GSTIN (Goods &amp; Services Tax)</span>
                  <span className="field-hint">Validates Indian GSTIN &amp; Auto-fills Data</span>
                </label>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="e.g. 06AALCM8009M1Z1"
                    maxLength={15}
                    value={primaryGst}
                    onChange={(e) => {
                      setPrimaryGst(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                      setIsPrimaryGstVerified(false);
                      setGstVerifyMessage(null);
                    }}
                  />
                  <button
                    type="button"
                    className={`clean-inline-btn ${isPrimaryGstVerified ? "is-verified" : ""}`}
                    disabled={isVerifyingPrimaryGst || isPrimaryGstVerified}
                    onClick={handleVerifyPrimaryGst}
                  >
                    {isVerifyingPrimaryGst ? "Verifying…" : isPrimaryGstVerified ? "✓ Verified" : "Verify GST"}
                  </button>
                </div>
                {gstVerifyMessage && (
                  <div className={`clean-verified-box ${!isPrimaryGstVerified ? "clean-error-box" : ""}`}>
                    <span className="verified-icon">{isPrimaryGstVerified ? "✓" : "!"}</span>
                    <span className="verified-text">
                      <strong>GSTIN Status:</strong> {gstVerifyMessage}
                    </span>
                  </div>
                )}
              </div>

              {/* Company Name */}
              <div className="clean-field">
                <label>
                  <span>Company / Legal Enterprise Name <span className="req-star">*</span></span>
                </label>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="e.g. Mabsol Infotech Pvt Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Registered Address */}
              <div className="clean-field">
                <label>Registered Warehouse / Office Address</label>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Plot No., Industrial Area, Sector"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* City, State & PIN Code */}
              <div className="clean-grid-3">
                <div className="clean-field">
                  <label>City</label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="e.g. Gurugram"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="clean-field">
                  <label>State</label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="e.g. Haryana"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                </div>

                <div className="clean-field">
                  <label>Postal PIN</label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="6-digit PIN"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                      onBlur={handlePincodeBlur}
                    />
                  </div>
                </div>
              </div>

              {/* Drug License Number */}
              <div className="clean-field">
                <label>
                  <span>Drug License Number (DL No. Form 20B/21B)</span>
                  <span className="field-hint">Optional Pharma Master</span>
                </label>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8.5 8.5l7 7" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <input
                    type="text"
                    placeholder="e.g. DL-HR-GUR-198273"
                    value={drugLicenseNo}
                    onChange={(e) => setDrugLicenseNo(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              {/* Multi-GST Section */}
              <div className="clean-multi-gst-box">
                <div className="multi-gst-top">
                  <span className="multi-gst-title">
                    <span>🏢 Additional State GSTINs (Multi-Branch)</span>
                  </span>
                  <button type="button" className="btn-add-gst" onClick={handleAddAdditionalGst}>
                    + Add Another GSTIN
                  </button>
                </div>

                {additionalGsts.length === 0 ? (
                  <p className="multi-gst-desc">
                    Operating in multiple states (e.g. Delhi, Baddi, Maharashtra)? Add extra GSTINs to manage multi-branch billing seamlessly.
                  </p>
                ) : (
                  additionalGsts.map((item, idx) => (
                    <div key={item.id} className="clean-branch-card">
                      <div className="branch-card-row">
                        <div className="clean-input-row" style={{ flex: 1 }}>
                          <input
                            type="text"
                            placeholder={`Branch #${idx + 2} 15-digit GSTIN`}
                            maxLength={15}
                            value={item.gstNo}
                            onChange={(e) => {
                              const list = [...additionalGsts];
                              list[idx].gstNo = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                              list[idx].verified = false;
                              setAdditionalGsts(list);
                            }}
                          />
                          <button
                            type="button"
                            className={`clean-inline-btn ${item.verified ? "is-verified" : ""}`}
                            disabled={item.isVerifying || item.verified}
                            onClick={() => handleVerifyAdditionalGst(idx)}
                          >
                            {item.isVerifying ? "Verifying…" : item.verified ? "✓ Verified" : "Verify"}
                          </button>
                        </div>
                        <button
                          type="button"
                          className="btn-delete-gst"
                          onClick={() => handleRemoveAdditionalGst(item.id)}
                          title="Remove GSTIN"
                        >
                          ✕
                        </button>
                      </div>
                      {item.verified && (
                        <div className="branch-verified-tag">
                          ✓ State: <strong>{item.state}</strong> ({item.city || "Branch Depot"})
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: ADMIN PROFILE & OTP SECURITY
             ======================================================== */}
          {currentStep === 2 && (
            <div className="clean-form-module">
              <div className="clean-grid-2">
                <div className="clean-field">
                  <label>Administrator / Owner Full Name <span className="req-star">*</span></label>
                  <div className="clean-input-row">
                    <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))}
                      maxLength={80}
                      required
                    />
                  </div>
                </div>

                <div className="clean-field">
                  <label>Designation</label>
                  <div className="clean-input-row">
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    >
                      <option value="Managing Director">Managing Director</option>
                      <option value="Director / Partner">Director / Partner</option>
                      <option value="Proprietor">Proprietor</option>
                      <option value="VP / Sales Head">VP / Sales Head</option>
                      <option value="Commercial Manager">Commercial Manager</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Work Email with OTP */}
              <div className="clean-field">
                <label>
                  <span>Work Email Address <span className="req-star">*</span></span>
                  {emailVerified && <span className="verified-badge">✓ Email Verified</span>}
                </label>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <input
                    type="email"
                    placeholder="director@pharma.com"
                    value={email}
                    disabled={emailVerified}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`clean-inline-btn ${emailVerified ? "is-verified" : ""}`}
                    disabled={emailVerified || emailSending}
                    onClick={handleSendEmailOtp}
                  >
                    {emailVerified ? "✓ Verified" : emailSending ? "Sending…" : "Send OTP"}
                  </button>
                </div>
              </div>

              {emailOtpSent && !emailVerified && (
                <div className="clean-otp-box">
                  <label>Enter 6-Digit Email OTP</label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="Enter email OTP code"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    />
                    <button
                      type="button"
                      className="clean-inline-btn"
                      disabled={emailVerifying || !emailOtp}
                      onClick={handleVerifyEmailOtp}
                    >
                      {emailVerifying ? "Verifying…" : "Confirm OTP"}
                    </button>
                  </div>
                </div>
              )}

              {/* WhatsApp Mobile with OTP */}
              <div className="clean-field">
                <label>
                  <span>WhatsApp Mobile Number <span className="req-star">*</span></span>
                  {mobileVerified && <span className="verified-badge">✓ Mobile Verified</span>}
                </label>
                <div className="clean-input-row">
                  <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 3.5h3l1.4 4.4-2.2 1.8a13 13 0 0 0 5.6 5.6l1.8-2.2 4.4 1.4v3a2 2 0 0 1-2.2 2C10.3 19 5 13.7 4.5 5.7A2 2 0 0 1 6.5 3.5z" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={mobile}
                    disabled={mobileVerified}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  />
                  <button
                    type="button"
                    className={`clean-inline-btn ${mobileVerified ? "is-verified" : ""}`}
                    disabled={mobileVerified || mobileSending}
                    onClick={handleSendMobileOtp}
                  >
                    {mobileVerified ? "✓ Verified" : mobileSending ? "Sending…" : "Send WhatsApp OTP"}
                  </button>
                </div>
              </div>

              {mobileOtpSent && !mobileVerified && (
                <div className="clean-otp-box">
                  <label>Enter 6-Digit WhatsApp OTP</label>
                  <div className="clean-input-row">
                    <input
                      type="text"
                      placeholder="Enter WhatsApp OTP code"
                      maxLength={6}
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ""))}
                    />
                    <button
                      type="button"
                      className="clean-inline-btn"
                      disabled={mobileVerifying || !mobileOtp}
                      onClick={handleVerifyMobileOtp}
                    >
                      {mobileVerifying ? "Verifying…" : "Confirm OTP"}
                    </button>
                  </div>
                </div>
              )}

              {/* Password & Confirm Password */}
              <div className="clean-grid-2">
                <div className="clean-field">
                  <label>Password <span className="req-star">*</span></label>
                  <div className="clean-input-row">
                    <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="clean-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "👁️" : "🙈"}
                    </button>
                  </div>
                </div>

                <div className="clean-field">
                  <label>Confirm Password <span className="req-star">*</span></label>
                  <div className="clean-input-row">
                    <svg className="clean-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-type password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="clean-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? "👁️" : "🙈"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: REVIEW & INSTANT LAUNCH
             ======================================================== */}
          {currentStep === 3 && (
            <div className="clean-form-module">
              <div className="clean-review-card">
                <div className="review-item">
                  <span className="rev-label">Company Enterprise</span>
                  <span className="rev-val">{companyName || "N/A"}</span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Primary GSTIN</span>
                  <span className="rev-val mono-font">
                    {primaryGst || "Unregistered"} {isPrimaryGstVerified ? "✓" : ""}
                  </span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Location / State</span>
                  <span className="rev-val">{city ? `${city}, ${state}` : state || "India"}</span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Multi-GST Branches</span>
                  <span className="rev-val">
                    {additionalGsts.length > 0 ? `${additionalGsts.length} Additional Branch(es)` : "Single Location"}
                  </span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Admin Owner</span>
                  <span className="rev-val">{name} ({designation})</span>
                </div>
                <div className="review-item">
                  <span className="rev-label">Verified Email</span>
                  <span className="rev-val">{email}</span>
                </div>
                <div className="review-item">
                  <span className="rev-label">WhatsApp Mobile</span>
                  <span className="rev-val mono-font">+91 {mobile}</span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action Buttons */}
          <div className="clean-wizard-actions">
            {currentStep > 1 && (
              <button
                type="button"
                className="clean-btn-back"
                onClick={() => setCurrentStep((s) => (s - 1) as any)}
                disabled={loading}
              >
                ← Back
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                className="clean-btn-primary"
                onClick={goToNextStep}
              >
                {currentStep === 1 ? "Next: Admin Profile & OTP →" : "Review & Confirm →"}
              </button>
            ) : (
              <button
                type="button"
                className="clean-btn-primary"
                disabled={loading}
                onClick={handleCompleteRegistration}
              >
                {loading ? <span className="clean-spinner" aria-hidden="true" /> : null}
                {loading ? "Launching Workspace…" : "🚀 Launch Pharma CRM Workspace"}
              </button>
            )}
          </div>

          <p className="clean-switch-text">
            Already have an account?{" "}
            <button
              type="button"
              className="clean-link-signin"
              onClick={() => router.push("/login")}
            >
              Sign in →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}