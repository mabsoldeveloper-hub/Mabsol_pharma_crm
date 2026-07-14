"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});
import "./login.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const bars = [30, 48, 40, 72, 54, 64];

  const emailIsValid = EMAIL_RE.test(email.trim());
  const showEmailError = emailTouched && email.length > 0 && !emailIsValid;

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

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
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setOtpError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {              
      // const res = await fetch("/api/auth/login-verify-otp", {
       // fetch("/api/auth/login-verify-otp", {
      const res = await fetch("/api/auth/login-verify-otp", {
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
    <div className={`page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <div className="mesh" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <div className="stage">
        {/* FORM CARD */}
        <div className="glass-card form-card">
          <div className="brand-row">
            <span className="brand-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l2.4 5.1L20 9l-4 4.2L17 19l-5-2.7L7 19l1-5.8L4 9l5.6-.9L12 3Z"
                  fill="var(--orange-light)"
                />
              </svg>
            </span>
            <span className="brand-name">Mabsol Pharma CRM</span>
          </div>

          {step === "credentials" ? (
            <>
              <h1>Welcome back</h1>
              <p className="lede">Sign in to pick up right where Marg left off.</p>

              <form onSubmit={handleLogin} noValidate>
                {error && (
                  <div className="error-banner" role="alert">
                    {error}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="email">Email</label>
                  <div className={`input-row ${showEmailError ? "input-row-error" : ""}`}>
                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
                  New to Mabsol CRM?{" "}
                  <button type="button" className="link-strong" onClick={() => router.push("/register")}>
                    Create an account
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
            <span>Marg</span>
            <span>CRM</span>
          </div>

          <div className="beam-capsule">
            <span className="beam-track" />
            <span className="beam-node" />
            <span className="beam-particle" />
            <span className="beam-node" />

            <span className="heartbeat-chip">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12h4l2-7 4 14 3-9 2 4h5"
                  stroke="var(--orange-light)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* SYNC CARD */}
        <div className="glass-card sync-card" aria-hidden="true">
          <div className="sync-top">
            <div className="sync-dots">
              <span /><span /><span />
            </div>
            <span className="live-pill">
              <span className="live-dot" />
              Live
            </span>
          </div>

          <span className="eyebrow">Live from Marg</span>
          <h2>Synced instantly</h2>

          <div className="sync-tiles">
            <div className="sync-tile">
              <p className="tile-label">Sales</p>
              <div className="mini-bars">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                ))}
              </div>
            </div>

            <div className="sync-tile">
              <p className="tile-label">Refresh</p>
              <p className="sync-value">60s</p>
              <p className="sync-caption">from Marg</p>
            </div>
          </div>

          <div className="sync-toast">
            <span className="notif-dot" />
            <div>
              <p className="notif-title">Invoice #INV-2291 synced</p>
              <p className="notif-sub">2 seconds ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}