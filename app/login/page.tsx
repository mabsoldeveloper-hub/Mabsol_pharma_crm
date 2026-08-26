"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import PharmaBackgroundCanvas from "@/components/PharmaBackgroundCanvas";
import CelestialCursor from "@/components/CelestialCursor";
import "./login.css";

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

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TILT_MAX_DEG = 8;

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const rememberMe = false;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // 3D tilt for the form card
  const formCardRef = useRef<HTMLDivElement | null>(null);

  const [previewPhase, setPreviewPhase] = useState<"auto" | "morning" | "afternoon" | "evening" | "night">("auto");
  const [detectedPhase, setDetectedPhase] = useState<"morning" | "afternoon" | "evening" | "night">("morning");

  const bars = [32, 54, 42, 85, 62, 74];

  const emailIsValid = EMAIL_RE.test(email.trim());
  const showEmailError = emailTouched && email.length > 0 && !emailIsValid;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setDetectedPhase("morning");
    } else if (hour >= 12 && hour < 17) {
      setDetectedPhase("afternoon");
    } else if (hour >= 17 && hour < 20) {
      setDetectedPhase("evening");
    } else {
      setDetectedPhase("night");
    }
  }, []);

  const activePhase = previewPhase === "auto" ? detectedPhase : previewPhase;

  const getCelestialData = () => {
    switch (activePhase) {
      case "morning":
        return {
          greeting: "Good Morning",
          icon: "🌅",
          tag: "Dawn Shift Active",
          subtitle: "Sign in to access dawn pipeline, territory dispatch & real-time inventory.",
          themeClass: "login-theme-morning",
        };
      case "afternoon":
        return {
          greeting: "Good Afternoon",
          icon: "☀️",
          tag: "Midday Surge",
          subtitle: "Peak-hour throughput active. Real-time billing & ERP sync running.",
          themeClass: "login-theme-afternoon",
        };
      case "evening":
        return {
          greeting: "Good Evening",
          icon: "🌇",
          tag: "Twilight Settlement",
          subtitle: "End-of-day sales reconciliation, territory summaries & warehouse ledger ready.",
          themeClass: "login-theme-evening",
        };
      case "night":
      default:
        return {
          greeting: "Good Night",
          icon: "🌙",
          tag: "Night Operations",
          subtitle: "Overnight automated batch sync & encrypted ledger backups active.",
          themeClass: "login-theme-night",
        };
    }
  };

  const celestial = getCelestialData();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function handleCardTiltMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = formCardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = (x / rect.width - 0.5) * 2; // -1 -> 1
    const percentY = (y / rect.height - 0.5) * 2; // -1 -> 1

    const rotateY = percentX * TILT_MAX_DEG;
    const rotateX = -percentY * TILT_MAX_DEG;

    card.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
  }

  function handleCardTiltLeave() {
    const card = formCardRef.current;
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setEmailTouched(true);
    setError(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password, rememberMe }),
      });

      const data = await res.json();

      if (data.success) {
        setStep("otp");
        setOtp(Array(OTP_LENGTH).fill(""));
        setResendTimer(RESEND_SECONDS);
        setTimeout(() => otpInputsRef.current[0]?.focus(), 0);
      } else {
        setError(data.message || "Couldn't sign you in. Check your details and try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setResendTimer(RESEND_SECONDS);
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeout(() => otpInputsRef.current[0]?.focus(), 0);
      } else {
        setOtpError(data.message || "Couldn't resend the code. Try again.");
      }
    } catch {
      setOtpError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError(null);

    if (digit && index < OTP_LENGTH - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    const lastFilled = Math.min(pasted.length, OTP_LENGTH) - 1;
    otpInputsRef.current[Math.max(lastFilled, 0)]?.focus();
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (verifyingOtp) return;

    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setOtpError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: code }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/dashboard");
      } else {
        setOtpError(data.message || "That code didn't work. Please try again.");
      }
    } catch {
      setOtpError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  return (
    <div className={`login-page ${celestial.themeClass} ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      {/* High Performance Dynamic Celestial Custom Cursor Pointer */}
      <CelestialCursor theme={activePhase} />

      {/* High Performance Interactive Molecular Background Canvas */}
      <PharmaBackgroundCanvas />

      {/* Floating Interactive Celestial Time Live Preview Capsule */}
      <div className="celestial-preview-capsule">
        <div className="capsule-label">
          <span className="live-dot" />
          <span>Live Theme</span>
        </div>
        <div className="capsule-buttons">
          {[
            { id: "auto", label: "Auto", icon: "⏱️" },
            { id: "morning", label: "Morning", icon: "🌅" },
            { id: "afternoon", label: "Afternoon", icon: "☀️" },
            { id: "evening", label: "Evening", icon: "🌇" },
            { id: "night", label: "Night", icon: "🌙" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPreviewPhase(m.id as any)}
              className={`capsule-btn ${previewPhase === m.id ? "active" : ""}`}
              title={`Preview ${m.label} theme`}
            >
              <span>{m.icon}</span>
              <span className="btn-text">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Aurora Gradient Mesh Orbs */}
      <div className="mesh" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      {/* Floating Holographic Ambient Badges with High-Detail SVG Icons */}
      <div className="floating-badge badge-tl" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 3c6 4 10 4 16 0M4 21c6-4 10-4 16 0" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 6v12M12 4v16M17 6v12" stroke="#00f2fe" strokeWidth="1.8" strokeDasharray="2 3" strokeLinecap="round" />
            <circle cx="7" cy="6" r="2" fill="#00f2fe" />
            <circle cx="17" cy="18" r="2" fill="#00f2fe" />
          </svg>
        </div>
        <div className="badge-content">
          <span className="badge-title">Biotech Pipeline</span>
          <span className="badge-value">Active &amp; Encrypted</span>
        </div>
      </div>

      <div className="floating-badge badge-tr" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" stroke="#10b981" strokeWidth="1.8" fill="rgba(16, 185, 129, 0.15)" />
            <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="badge-content">
          <span className="badge-title">Pharma Compliance</span>
          <span className="badge-value">21 CFR Part 11</span>
        </div>
      </div>

      <div className="floating-badge badge-bl" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#ff7700" strokeWidth="2" strokeLinejoin="round" fill="rgba(255, 119, 0, 0.25)" />
          </svg>
        </div>
        <div className="badge-content">
          <span className="badge-title">Sync Latency</span>
          <span className="badge-value">&lt; 80ms Real-Time</span>
        </div>
      </div>

      <div className="floating-badge badge-br" aria-hidden="true">
        <div className="badge-icon-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="12" width="4" height="9" rx="1.5" fill="#818cf8" />
            <rect x="10" y="7" width="4" height="14" rx="1.5" fill="#a78bfa" />
            <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#c084fc" />
            <path d="M4 10l7-5 6-2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="badge-content">
          <span className="badge-title">Batch Intelligence</span>
          <span className="badge-value">Live ERP Stream</span>
        </div>
      </div>

      <div className="stage">
        {/* FORM CARD — 3D tilt follows the cursor */}
        <div
          className="glass-card form-card"
          ref={formCardRef}
          onMouseMove={handleCardTiltMove}
          onMouseLeave={handleCardTiltLeave}
        >
          <div className="brand-row">
            <span className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffb347" />
                    <stop offset="50%" stopColor="#ff7700" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                  <filter id="brandGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff7700" floodOpacity="0.8" />
                  </filter>
                </defs>
                {/* 3D Hexagon Emblem */}
                <path
                  d="M16 2.5 L28 9.5 L28 22.5 L16 29.5 L4 22.5 L4 9.5 Z"
                  stroke="url(#brandGrad)"
                  strokeWidth="2.2"
                  fill="rgba(255, 119, 0, 0.2)"
                  filter="url(#brandGlow)"
                />
                {/* Interlocking Medical Cross */}
                <path
                  d="M13.5 8 H18.5 V13.5 H24 V18.5 H18.5 V24 H13.5 V18.5 H8 V13.5 H13.5 Z"
                  fill="url(#brandGrad)"
                />
                {/* Specular Glint Center */}
                <circle cx="16" cy="16" r="2.8" fill="#ffffff" />
                <circle cx="14.8" cy="14.8" r="1" fill="#ffffff" />
              </svg>
            </span>
            <span className="brand-name">Mabsol Pharma CRM</span>
          </div>

          {step === "credentials" ? (
            <>
              <h1>
                {celestial.greeting} <span className="greeting-icon">{celestial.icon}</span>
              </h1>
              <p className="lede">{celestial.subtitle}</p>

              <form onSubmit={handleLogin} noValidate>
                {error && (
                  <div className="error-banner" role="alert">
                    {error}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="email">Email</label>
                  <div className={`input-row ${showEmailError ? "input-row-error" : ""}`}>
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@pharmacy.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      required
                      disabled={loading}
                      aria-invalid={showEmailError}
                    />
                  </div>
                  {showEmailError && (
                    <p className="field-error">Enter a valid email, e.g. name@example.com</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="input-row">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="12" cy="15.5" r="1.5" fill="currentColor" />
                    </svg>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="toggle-visibility"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M6.6 6.7C4.5 8.1 3 10 2 12c1.8 3.6 5.5 7 10 7 1.7 0 3.3-.4 4.7-1.2M9.9 4.2A10.8 10.8 0 0112 4c4.5 0 8.2 3.4 10 7-.5 1-1.2 2.1-2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M2 12c1.8-3.6 5.5-7 10-7s8.2 3.4 10 7c-1.8 3.6-5.5 7-10 7s-8.2-3.4-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" aria-hidden="true" /> : null}
                  {loading ? "Signing in…" : "Log in"}
                </button>

                <p className="switch-line">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="link-strong"
                    onClick={() => router.push("/register")}
                  >
                    Create an account →
                  </button>
                </p>
              </form>
            </>
          ) : (
            <>
              <h1>Verify your email</h1>
              <p className="lede">
                We sent a {OTP_LENGTH}-digit code to <strong>{email}</strong>. Enter it below to continue.
              </p>

              <form onSubmit={handleVerifyOtp} noValidate>
                {otpError && (
                  <div className="error-banner" role="alert">
                    {otpError}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="otp-0">Verification code</label>
                  <div className="otp-row" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        ref={(el) => {
                          otpInputsRef.current[i] = el;
                        }}
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-box"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        disabled={verifyingOtp}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={verifyingOtp}>
                  {verifyingOtp ? <span className="spinner" aria-hidden="true" /> : null}
                  {verifyingOtp ? "Verifying…" : "Verify & continue"}
                </button>

                <p className="switch-line">
                  Didn't get the code?{" "}
                  <button
                    type="button"
                    className="link-strong"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || resending}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : resending ? "Sending…" : "Resend code"}
                  </button>
                </p>

                <p className="switch-line">
                  <button
                    type="button"
                    className="link-strong"
                    onClick={() => {
                      setStep("credentials");
                      setOtpError(null);
                    }}
                  >
                    ← Back to login
                  </button>
                </p>
              </form>
            </>
          )}
        </div>

        {/* BEAM — glowing 3D sync capsule connecting the two panels */}
        <div className="beam-wrap" aria-hidden="true">
          <div className="beam-labels">
            <span>ERP</span>
            <span>CRM</span>
          </div>

          <div className="beam-capsule">
            <span className="beam-track" />
            <span className="beam-node" />
            <span className="beam-particle" />
            <span className="beam-node" />

            <span className="heartbeat-chip">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f2fe" />
                    <stop offset="50%" stopColor="#ff9f43" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="ecgGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#ff7700" floodOpacity="0.9" />
                  </filter>
                </defs>
                <path
                  d="M2 12h4l2-7 4 14 3-9 2 4h5"
                  stroke="url(#ecgGrad)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#ecgGlow)"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* SYNC CARD — Highly detailed SaaS ERP-CRM live sync metrics */}
        <div className="glass-card sync-card" aria-hidden="true">
          <div className="sync-top">
            <div className="sync-dots">
              <span className="dot-red" /><span className="dot-yellow" /><span className="dot-green" />
            </div>
            <span className="live-pill">
              <span className="live-dot" />
              Live Sync
            </span>
          </div>

          <div className="sync-eyebrow-row">
            <span className="eyebrow">LIVE FROM ERP</span>
          </div>
          <h2>Synced instantly</h2>

          <div className="sync-tiles">
            {/* Sales Velocity Tile */}
            <div className="sync-tile">
              <div className="tile-header">
                <p className="tile-label">Sales Velocity</p>
                <span className="growth-pill">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  +24.8%
                </span>
              </div>
              <div className="mini-bars-wrapper">
                <div className="mini-bars">
                  {bars.map((h, i) => (
                    <div key={i} className="bar-col">
                      <span className="bar-fill" style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                    </div>
                  ))}
                </div>
                <div className="bars-baseline" />
              </div>
            </div>

            {/* Auto-Refresh Tile */}
            <div className="sync-tile">
              <div className="tile-header">
                <p className="tile-label">Refresh Cycle</p>
                <span className="sync-status-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="spin-sync">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="#ea580c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className="metric-row">
                <p className="sync-value">60s</p>
                <span className="latency-badge">&lt; 40ms</span>
              </div>
              <p className="sync-caption">Active Zero-Loss Stream</p>
            </div>
          </div>

          {/* Real-time Activity Notification Card */}
          <div className="sync-toast">
            <div className="toast-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="toast-content">
              <p className="notif-title">Invoice #INV-2291 synced</p>
              <p className="notif-sub">Batch #8491-X • 2s ago</p>
            </div>
            <span className="amount-badge">+₹1,84,500</span>
          </div>
        </div>
      </div>
    </div>
  );
}