"use client";

import { useState, type FormEvent } from "react";
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

const NAVY = "#343872";
const NAVY_DARK = "#12153A";
const NAVY_SOFT = "#4A4E8C";
const ORANGE = "#fb8c00";
const ORANGE_LIGHT = "#ffb45c";
const SURFACE = "#F7F7FD";
const MUTED = "#6668A0";
const MUTED_SOFT = "#A6A8D2";
const GREEN = "#22C55E";
const BORDER = "#ECEEF9";
const DANGER = "#E4483F";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bars = [30, 48, 40, 72, 54, 64];

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/dashboard");
      } else {
        setError(data.message || "Couldn't sign you in. Check your details and try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`screen ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      {/* LEFT — FORM */}
      <div className="left">
        <div className="left-glow" />
        <div className="form-card">
          <div className="brand-row">
            <span className="brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l2.4 5.1L20 9l-4 4.2L17 19l-5-2.7L7 19l1-5.8L4 9l5.6-.9L12 3Z"
                  fill={ORANGE}
                />
              </svg>
            </span>
            <span className="brand-name">Mabsol Pharma CRM</span>
          </div>

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
              <div className="input-row">
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
                  required
                  disabled={loading}
                />
              </div>
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
        </div>
      </div>

      {/* RIGHT — LIVE SYNC PANEL */}
      <div className="right" aria-hidden="true">
        <div className="right-glow" />

        <div className="right-copy">
          <span className="eyebrow">Live from Marg</span>
          <h2>Every heartbeat, synced instantly</h2>
          <p>
            The moment you log in, your sales, stock and account data from
            Marg is already here — no waiting, no exports.
          </p>
        </div>

        {/* SIGNATURE: pulse-sync line between Marg and CRM */}
        <div className="pulse-track">
          <span className="pulse-node pulse-node-left">Marg</span>
          <svg className="pulse-svg" viewBox="0 0 420 60" preserveAspectRatio="none">
            <path
              className="pulse-base"
              d="M0 30 H150 L165 10 L180 50 L195 14 L210 30 H420"
              fill="none"
              stroke={ORANGE}
              strokeWidth="2"
            />
            <path
              className="pulse-sweep"
              d="M0 30 H150 L165 10 L180 50 L195 14 L210 30 H420"
              fill="none"
              stroke={ORANGE_LIGHT}
              strokeWidth="2.6"
              strokeLinecap="round"
              pathLength={1000}
            />
          </svg>
          <span className="pulse-node pulse-node-right">CRM</span>
        </div>

        <div className="preview-card">
          <div className="preview-top">
            <div className="preview-dots">
              <span /><span /><span />
            </div>
            <span className="live-pill">
              <span className="live-dot" />
              Live
            </span>
          </div>

          <div className="preview-body">
            <div className="preview-tile">
              <p className="tile-label">Sales Report</p>
              <div className="mini-bars">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                ))}
              </div>
            </div>

            <div className="preview-tile preview-tile-dark">
              <p className="tile-label muted-on-dark">Sync Status</p>
              <p className="sync-value">60s</p>
              <p className="sync-caption">refresh from Marg</p>
            </div>
          </div>

          <div className="preview-toast">
            <span className="notif-dot" />
            <div>
              <p className="notif-title">Invoice #INV-2291 synced</p>
              <p className="notif-sub">2 seconds ago</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .screen {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: var(--font-body);
          background: #fff;
        }

        h1, h2, .brand-name {
          font-family: var(--font-display);
        }

        .sync-value {
          font-family: var(--font-mono);
        }

        /* LEFT */
        .left {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: ${SURFACE};
          overflow: hidden;
        }

        .left-glow {
          position: absolute;
          width: 520px;
          height: 520px;
          left: -220px;
          bottom: -220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251, 140, 0, 0.08), transparent 70%);
          animation: drift 14s ease-in-out infinite;
        }

        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
        }

        .form-card {
          position: relative;
          width: 100%;
          max-width: 400px;
          background: #fff;
          border: 1px solid ${BORDER};
          border-radius: 20px;
          padding: 40px 36px;
          box-shadow: 0 30px 60px -34px rgba(52, 56, 114, 0.28);
          animation: card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes card-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .brand-row,
        h1,
        .lede,
        form > * {
          animation: field-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .brand-row { animation-delay: 0.05s; }
        h1 { animation-delay: 0.1s; }
        .lede { animation-delay: 0.15s; }
        form > *:nth-child(1) { animation-delay: 0.2s; }
        form > *:nth-child(2) { animation-delay: 0.25s; }
        form > *:nth-child(3) { animation-delay: 0.3s; }
        form > *:nth-child(4) { animation-delay: 0.35s; }
        form > *:nth-child(5) { animation-delay: 0.4s; }
        form > *:nth-child(6) { animation-delay: 0.45s; }

        @keyframes field-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .brand-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
        }

        .brand-mark {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name {
          font-size: 15px;
          font-weight: 700;
          color: ${NAVY};
          letter-spacing: -0.01em;
        }

        h1 {
          margin: 0 0 6px;
          font-size: 27px;
          font-weight: 700;
          color: ${NAVY};
          letter-spacing: -0.02em;
        }

        .lede {
          margin: 0 0 28px;
          color: ${MUTED};
          font-size: 14.5px;
          line-height: 1.6;
        }

        .error-banner {
          background: #fdecea;
          border: 1px solid #f6c6c2;
          color: ${DANGER};
          font-size: 13.5px;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 18px;
          line-height: 1.5;
        }

        .field {
          margin-bottom: 18px;
        }

        .field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: ${NAVY};
          margin-bottom: 6px;
        }

        .input-row {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 13px;
          color: ${MUTED_SOFT};
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .input-row:focus-within .input-icon {
          color: ${ORANGE};
        }

        .field input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 14px 11px 38px;
          border-radius: 10px;
          border: 1px solid ${BORDER};
          background: #fff;
          font-size: 14.5px;
          color: ${NAVY};
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .field input::placeholder {
          color: ${MUTED_SOFT};
        }

        .field input:focus-visible {
          outline: none;
          border-color: ${ORANGE};
          box-shadow: 0 0 0 3px rgba(251, 140, 0, 0.15);
        }

        .field input:disabled {
          background: ${SURFACE};
          color: ${MUTED_SOFT};
        }

        .password-row input,
        .input-row input {
          padding-right: 42px;
        }

        .toggle-visibility {
          position: absolute;
          right: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          padding: 4px;
          color: ${MUTED_SOFT};
          cursor: pointer;
          border-radius: 6px;
        }

        .toggle-visibility:hover {
          color: ${NAVY};
        }

        .toggle-visibility:focus-visible {
          outline: 2px solid ${ORANGE};
          outline-offset: 2px;
        }

        .row-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .remember {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: ${MUTED};
          cursor: pointer;
        }

        .remember input {
          accent-color: ${ORANGE};
        }

        .link {
          font-size: 13px;
          color: ${MUTED};
          text-decoration: none;
        }

        .link:hover {
          color: ${ORANGE};
        }

        .link:focus-visible,
        .link-strong:focus-visible {
          outline: 2px solid ${ORANGE};
          outline-offset: 2px;
          border-radius: 4px;
        }

        .btn-primary {
          position: relative;
          overflow: hidden;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: ${ORANGE};
          color: #fff;
          border: none;
          padding: 13px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 10px 24px -10px rgba(251, 140, 0, 0.5);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }

        .btn-primary::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.35) 40%, transparent 60%);
          transform: translateX(-120%);
          transition: transform 0.6s ease;
        }

        .btn-primary:hover:not(:disabled)::before {
          transform: translateX(120%);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px -10px rgba(251, 140, 0, 0.6);
        }

        .btn-primary:focus-visible {
          outline: 2px solid ${NAVY};
          outline-offset: 2px;
        }

        .btn-primary:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .switch-line {
          margin: 20px 0 0;
          text-align: center;
          font-size: 13.5px;
          color: ${MUTED};
        }

        .link-strong {
          background: none;
          border: none;
          padding: 0;
          color: ${ORANGE};
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
        }

        .link-strong:hover {
          text-decoration: underline;
        }

        /* RIGHT */
        .right {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 32px;
          padding: 64px;
          overflow: hidden;
          background: linear-gradient(160deg, ${NAVY_DARK}, ${NAVY} 60%, #2a2e63);
        }

        .right-glow {
          position: absolute;
          width: 480px;
          height: 480px;
          right: -140px;
          top: -140px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251, 140, 0, 0.25), transparent 70%);
          animation: breathe 6s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }

        .right-copy {
          position: relative;
          max-width: 420px;
        }

        .eyebrow {
          display: inline-block;
          padding: 6px 13px;
          border-radius: 999px;
          background: rgba(251, 140, 0, 0.16);
          color: ${ORANGE_LIGHT};
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 18px;
        }

        .right-copy h2 {
          margin: 0 0 12px;
          color: #fff;
          font-size: 29px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .right-copy p {
          margin: 0;
          color: #c3c4e6;
          font-size: 15px;
          line-height: 1.65;
        }

        /* SIGNATURE PULSE TRACK */
        .pulse-track {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 420px;
        }

        .pulse-node {
          flex-shrink: 0;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #d7d8f2;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 5px 10px;
          border-radius: 999px;
        }

        .pulse-node-right {
          color: ${NAVY_DARK};
          background: ${ORANGE_LIGHT};
          border-color: transparent;
        }

        .pulse-svg {
          flex: 1;
          height: 44px;
          overflow: visible;
        }

        .pulse-base {
          opacity: 0.22;
        }

        .pulse-sweep {
          stroke-dasharray: 130 950;
          stroke-dashoffset: 0;
          filter: drop-shadow(0 0 5px rgba(255, 180, 92, 0.75));
          animation: sweep 2.6s linear infinite;
        }

        @keyframes sweep {
          to { stroke-dashoffset: -1080; }
        }

        .preview-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 40px 70px -30px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          animation: card-in 0.6s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .preview-top {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid ${BORDER};
        }

        .preview-dots {
          display: flex;
          gap: 6px;
        }

        .preview-dots span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d8dbef;
        }

        .live-pill {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          background: #eef9f0;
          color: ${NAVY};
          padding: 4px 10px;
          border-radius: 999px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${GREEN};
          animation: pulse 1.8s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        .preview-body {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
        }

        .preview-tile {
          padding: 18px 20px;
        }

        .preview-tile-dark {
          background: linear-gradient(160deg, ${NAVY_DARK}, ${NAVY_SOFT});
        }

        .tile-label {
          margin: 0 0 12px;
          font-size: 12px;
          font-weight: 700;
          color: ${NAVY};
        }

        .muted-on-dark {
          color: #b6b8e6;
        }

        .mini-bars {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 56px;
        }

        .mini-bars span {
          flex: 1;
          border-radius: 3px 3px 0 0;
          background: linear-gradient(180deg, ${ORANGE_LIGHT}, ${ORANGE});
          transform: scaleY(0);
          transform-origin: bottom;
          animation: bar-grow 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes bar-grow {
          to { transform: scaleY(1); }
        }

        .sync-value {
          margin: 0;
          font-size: 26px;
          font-weight: 600;
          color: #fff;
        }

        .sync-caption {
          margin: 2px 0 0;
          font-size: 11px;
          color: #9496c4;
        }

        .preview-toast {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 14px 20px;
          border-top: 1px solid ${BORDER};
        }

        .notif-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${ORANGE};
          flex-shrink: 0;
          animation: pulse 1.8s infinite;
        }

        .notif-title {
          margin: 0;
          font-size: 12.5px;
          font-weight: 600;
          color: ${NAVY};
        }

        .notif-sub {
          margin: 2px 0 0;
          font-size: 11px;
          color: ${MUTED_SOFT};
        }

        @media (prefers-reduced-motion: reduce) {
          .live-dot,
          .notif-dot,
          .spinner,
          .left-glow,
          .right-glow,
          .pulse-sweep,
          .form-card,
          .preview-card,
          .brand-row,
          h1,
          .lede,
          form > *,
          .mini-bars span {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }

        /* RESPONSIVE */
        @media (max-width: 991px) {
          .screen {
            grid-template-columns: 1fr;
          }
          .right {
            display: none;
          }
          .left {
            min-height: 100vh;
          }
        }

        @media (max-width: 480px) {
          .form-card {
            padding: 32px 24px;
            border-radius: 16px;
          }
        }
      `}</style>
    </div>
  );
}