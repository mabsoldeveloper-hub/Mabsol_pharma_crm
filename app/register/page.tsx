"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./register.css";

/* ---------- tiny inline icon set (no external icon lib needed) ---------- */
const IconUser = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
    <path d="M4.5 7l7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6.5 3.5h3l1.4 4.4-2.2 1.8a13 13 0 0 0 5.6 5.6l1.8-2.2 4.4 1.4v3a2 2 0 0 1-2.2 2C10.3 19 5 13.7 4.5 5.7A2 2 0 0 1 6.5 3.5z" strokeLinejoin="round" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
    <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" strokeLinecap="round" />
  </svg>
);
const IconEye = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
    {open ? (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.6" />
      </>
    ) : (
      <path
        d="M3.5 3.5l17 17M6.6 6.9C4.2 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.9 0 3.5-.6 4.8-1.5M9.9 9.7a2.6 2.6 0 0 0 3.6 3.7M14.3 5.9c5.3.9 7.2 6.1 7.2 6.1a13 13 0 0 1-2.6 3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** small heartbeat / ECG pulse used inside verify buttons while sending or verifying */
const Pulse = () => (
  <span className="reg-pulse">
    <svg viewBox="0 0 46 14">
      <path d="M0 7h9l3-6 5 12 4-9 3 6h9l3-3" />
    </svg>
  </span>
);

/** larger heartbeat used in the Email <-> Mobile sync visual */
const BigPulse = () => (
  <svg viewBox="0 0 140 26">
    <path d="M0 13h20l6-11 10 22 8-17 6 11h20l6-6 6 6h20l6-9" />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const [mobile, setMobile] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const [emailSending, setEmailSending] = useState(false);
  const [mobileSending, setMobileSending] = useState(false);

  const [emailVerifying, setEmailVerifying] = useState(false);
  const [mobileVerifying, setMobileVerifying] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  /* subtle 3D tilt on mouse move — pure CSS custom properties, no re-render */
  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--ry", `${px * 6}deg`);
    card.style.setProperty("--rx", `${-py * 6}deg`);
  };
  const resetTilt = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--rx", `0deg`);
    card.style.setProperty("--ry", `0deg`);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (!emailVerified) {
      alert("Please verify your email first.");
      return;
    }

    if (!mobileVerified) {
      alert("Please verify your mobile number first.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, password }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Registration Successful");
        router.push("/login");
      } else {
        alert(data.message || "Registration Failed");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendEmailOTP = async () => {
    if (emailSending) return;
    if (!email) {
      alert("Enter Email");
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailOtpSent(true);
        alert("OTP Sent Successfully");
      } else {
        alert(data.message);
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setEmailSending(false);
    }
  };

  const verifyEmailOTP = async () => {
    if (emailVerifying) return;
    if (!emailOtp) {
      alert("Enter Email OTP");
      return;
    }
    setEmailVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: emailOtp }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailVerified(true);
        setEmailOtpSent(false);
        alert("Email Verified Successfully");
      } else {
        alert(data.message);
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setEmailVerifying(false);
    }
  };

  const sendMobileOTP = async () => {
    if (mobileSending) return;
    if (!mobile) {
      alert("Enter Mobile Number");
      return;
    }
    setMobileSending(true);
    try {
      const res = await fetch("/api/auth/send-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (data.success) {
        setMobileOtpSent(true);
        alert("WhatsApp OTP Sent Successfully");
      } else {
        alert(data.message);
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setMobileSending(false);
    }
  };

  const verifyMobileOTP = async () => {
    if (mobileVerifying) return;
    if (!mobileOtp) {
      alert("Enter OTP");
      return;
    }
    setMobileVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp: mobileOtp }),
      });
      const data = await res.json();
      if (data.success) {
        setMobileVerified(true);
        setMobileOtpSent(false);
        alert("Mobile Verified Successfully");
      } else {
        alert(data.message);
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setMobileVerifying(false);
    }
  };

  return (
    <div className="reg-page">
      <div className="reg-glow reg-glow-1" />
      <div className="reg-glow reg-glow-2" />
      <div className="reg-glow reg-glow-3" />

      <div className="reg-wrapper">
        {/* ---------------- Left: form card ---------------- */}
        <div
          className="reg-card"
          ref={cardRef}
          onMouseMove={handleTilt}
          onMouseLeave={resetTilt}
        >

          <div className="reg-title">
            <h3>Mabsol Pharma CRM</h3>
            <p>Create your account to get started</p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="reg-field">
              <label className="reg-label">Full Name</label>
              <div className="reg-input-group">
                <span className="reg-input-icon"><IconUser /></span>
                <input
                  type="text"
                  className="reg-input"
                  placeholder="Enter your name"
                  value={name}
                  minLength={3}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="reg-field">
              <label className="reg-label">Email Address</label>
              <div className="reg-input-group">
                <span className="reg-input-icon"><IconMail /></span>
                <input
                  type="email"
                  className="reg-input"
                  placeholder="Enter your email"
                  value={email}
                  disabled={emailVerified}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={`reg-verify-btn ${emailVerified ? "is-verified" : ""}`}
                  disabled={emailVerified || emailSending}
                  onClick={sendEmailOTP}
                >
                  {emailVerified ? (
                    <>
                      <IconCheck /> Verified
                    </>
                  ) : emailSending ? (
                    <>
                      <Pulse /> Sending
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </div>

            {emailOtpSent && !emailVerified && (
              <div className="reg-otp-field">
                <label className="reg-label">Email OTP</label>
                <div className="reg-input-group">
                  <input
                    className="reg-input"
                    style={{ paddingLeft: 14 }}
                    placeholder="Enter Email OTP"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                  />
                  <button
                    type="button"
                    className="reg-verify-btn"
                    onClick={verifyEmailOTP}
                    disabled={emailVerifying}
                  >
                    {emailVerifying ? (
                      <>
                        <Pulse /> Verifying
                      </>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </div>
            )}

            {emailVerified && (
              <div className="reg-success-banner">
                <IconCheck /> Email verified successfully
              </div>
            )}

            <div className="reg-field">
              <label className="reg-label">Mobile Number</label>
              <div className="reg-input-group">
                <span className="reg-input-icon"><IconPhone /></span>
                <input
                  type="tel"
                  className="reg-input"
                  placeholder="Enter mobile number"
                  value={mobile}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  disabled={!emailVerified || mobileVerified}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  required
                />
                <button
                  type="button"
                  className={`reg-verify-btn ${mobileVerified ? "is-verified" : ""}`}
                  disabled={!emailVerified || mobileVerified || mobileSending}
                  onClick={sendMobileOTP}
                >
                  {mobileVerified ? (
                    <>
                      <IconCheck /> Verified
                    </>
                  ) : mobileSending ? (
                    <>
                      <Pulse /> Sending
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </div>

            {mobileOtpSent && !mobileVerified && (
              <div className="reg-otp-field">
                <label className="reg-label">WhatsApp OTP</label>
                <div className="reg-input-group">
                  <input
                    className="reg-input"
                    style={{ paddingLeft: 14 }}
                    placeholder="Enter WhatsApp OTP"
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value)}
                  />
                  <button
                    type="button"
                    className="reg-verify-btn"
                    disabled={mobileVerifying}
                    onClick={verifyMobileOTP}
                  >
                    {mobileVerifying ? (
                      <>
                        <Pulse /> Verifying
                      </>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </div>
            )}

            {mobileVerified && (
              <div className="reg-success-banner">
                <IconCheck /> Mobile verified successfully
              </div>
            )}

            <div className="reg-field">
              <label className="reg-label">Password</label>
              <div className="reg-input-group">
                <span className="reg-input-icon"><IconLock /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="reg-input"
                  placeholder="Create a password"
                  value={password}
                  disabled={!mobileVerified}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="reg-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  <IconEye open={showPassword} />
                </button>
              </div>
            </div>

            <div className="reg-field">
              <label className="reg-label">Confirm Password</label>
              <div className="reg-input-group">
                <span className="reg-input-icon"><IconLock /></span>
                <input
                  type={showConfirm ? "text" : "password"}
                  className="reg-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  disabled={!mobileVerified}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="reg-eye-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  <IconEye open={showConfirm} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="reg-submit-btn"
              disabled={!emailVerified || !mobileVerified || loading}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            <p className="reg-foot-link">
              Already have an account? <a onClick={() => router.push("/login")}>Sign in</a>
            </p>
          </form>
        </div>

        {/* ---------------- Right: showcase panel ---------------- */}
        <div className="reg-showcase">
          <div className="reg-live-badge">
            <span className="reg-live-dot" /> Secure Sign-up
          </div>

          <div className="reg-showcase-heading">
            <span>VERIFIED IDENTITY</span>
            <h2>One heartbeat between your email and your phone.</h2>
          </div>

          <div className="reg-sync-row">
            <div className={`reg-sync-node ${emailVerified ? "" : "is-idle"}`}>
              <IconMail />
            </div>
            <div className="reg-sync-line">
              <BigPulse />
            </div>
            <div className={`reg-sync-node ${mobileVerified ? "" : "is-idle"}`}>
              <IconPhone />
            </div>
          </div>
          <div className="reg-sync-labels">
            <span>Email</span>
            <span>Mobile</span>
          </div>

          <div className="reg-stat-grid">
            <div className="reg-stat-card">
              <div className="reg-stat-label">Encryption</div>
              <div className="reg-stat-value">256-bit</div>
              <div className="reg-stat-sub">Data at rest &amp; transit</div>
            </div>
            <div className="reg-stat-card">
              <div className="reg-stat-label">OTP Validity</div>
              <div className="reg-stat-value">5 min</div>
              <div className="reg-stat-sub">Auto-expires</div>
            </div>
          </div>

          <div className="reg-info-row">
            <span className="reg-info-dot" />
            <div>
              <strong>Two-step verification</strong>
              <small>Email and WhatsApp OTP required before account creation</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}