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
import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const rememberMe = false;
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
                  fill="var(--orange)"
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
              stroke="var(--orange)"
              strokeWidth="2"
            />
            <path
              className="pulse-sweep"
              d="M0 30 H150 L165 10 L180 50 L195 14 L210 30 H420"
              fill="none"
              stroke="var(--orange-light)"
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
    </div>
  );
}
