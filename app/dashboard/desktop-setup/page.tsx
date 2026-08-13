"use client";

import { useState, useEffect, useCallback } from "react";

// --- Custom 2px Stroke Inline SVG Line Icons ---
const MonitorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg className={`shrink-0 ${spinning ? "animate-spin" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const PackageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
    <polyline points="2.32 6.16 12 11 21.68 6.16" />
    <line x1="12" y1="22.76" x2="12" y2="11" />
  </svg>
);

const KeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// --- Key Generator Helper ---
function generateRandomProductKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seg1 = "";
  let seg2 = "";
  for (let i = 0; i < 4; i++) {
    seg1 += chars.charAt(Math.floor(Math.random() * chars.length));
    seg2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MABSOL-CRM-${seg1}-${seg2}`;
}

export default function DesktopSetupPage() {
  const [buildStatus, setBuildStatus] = useState<"ready" | "needed">("ready");
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [clientName, setClientName] = useState("Mabsol Pharma Client");
  const [licensePeriod, setLicensePeriod] = useState("1 Year CRM Access");
  const [generatedKey, setGeneratedKey] = useState("MABSOL-CRM-XXXX-XXXX");
  const [keyAnimating, setKeyAnimating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/desktop-setup/download?check=true");
      if (res.ok) {
        const data = await res.json();
        setBuildStatus(data.available ? "ready" : "needed");
      }
    } catch (err) {
      setBuildStatus("ready");
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    checkStatus().finally(() => {
      setTimeout(() => setRefreshing(false), 400);
    });
  }, [checkStatus]);

  // Instant 1-second Download Handler
  const handleDownload = () => {
    setDownloading(true);
    window.location.href = "/api/desktop-setup/download";
    setTimeout(() => setDownloading(false), 3000);
  };

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [otpStep, setOtpStep] = useState<"email" | "otp">("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleOpenGenerateModal = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpStep("email");
    setOtpCode("");
    setOtpError(null);
    setShowOtpModal(true);
  };

  const handleSendOtp = async () => {
    if (!adminEmail || !adminEmail.includes("@")) {
      setOtpError("Please enter a valid admin email address.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpStep("otp");
      } else {
        setOtpError(data.message || "Failed to send verification code.");
      }
    } catch (err: any) {
      setOtpError(err?.message || "Error sending verification code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtpAndGenerate = async () => {
    if (otpCode.length !== 6) {
      setOtpError("Please enter all 6 digits of the OTP code.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail.trim(), otp: otpCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        // OTP Verified! Call key generator API
        const genRes = await fetch("/api/desktop-setup/generate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientName, validityDays: 365 }),
        });
        const genData = await genRes.json();
        if (genData.success && genData.key) {
          setGeneratedKey(genData.key);
          setShowOtpModal(false);
        } else {
          setGeneratedKey(generateRandomProductKey());
          setShowOtpModal(false);
        }
      } else {
        setOtpError(data.message || "Invalid OTP code. Please try again.");
      }
    } catch (err: any) {
      setOtpError(err?.message || "Verification failed.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  return (
    <div className="console-wrapper min-h-screen w-full p-3 sm:p-6 lg:p-8">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap");

        *, ::before, ::after {
          box-sizing: border-box;
        }

        .console-wrapper {
          background-color: #0d1017;
          background-image: radial-gradient(
              circle at 10% 10%,
              rgba(91, 110, 245, 0.1) 0%,
              transparent 40%
            ),
            radial-gradient(
              circle at 90% 10%,
              rgba(43, 213, 118, 0.06) 0%,
              transparent 45%
            );
          color: #edeff4;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
          opacity: 0;
          animation: consoleFadeIn 0.6s ease-out forwards;
          overflow-x: hidden;
        }

        @keyframes consoleFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .console-wrapper {
            animation: none !important;
            opacity: 1 !important;
          }
          .animate-spin,
          .pulse-dot {
            animation: none !important;
          }
        }

        .font-space {
          font-family: "Space Grotesk", sans-serif;
        }
        .font-mono-code {
          font-family: "JetBrains Mono", monospace;
        }

        /* Card styles - Responsive Padding */
        .console-card {
          background-color: #161a23;
          border: 1px solid #2a3040;
          border-radius: 12px;
          padding: 16px;
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .console-card {
            padding: 24px;
          }
        }

        /* Pulse badge animation */
        .pulse-dot {
          position: relative;
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pulse-dot-emerald {
          background-color: #2bd576;
          box-shadow: 0 0 0 0 rgba(43, 213, 118, 0.6);
          animation: pulseEmerald 2s infinite;
        }
        .pulse-dot-amber {
          background-color: #f5a524;
          box-shadow: 0 0 0 0 rgba(245, 165, 36, 0.6);
          animation: pulseAmber 2s infinite;
        }

        @keyframes pulseEmerald {
          0% {
            box-shadow: 0 0 0 0 rgba(43, 213, 118, 0.6);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(43, 213, 118, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(43, 213, 118, 0);
          }
        }

        @keyframes pulseAmber {
          0% {
            box-shadow: 0 0 0 0 rgba(245, 165, 36, 0.6);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(245, 165, 36, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(245, 165, 36, 0);
          }
        }

        /* Buttons */
        .btn-base {
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
          box-sizing: border-box;
          max-width: 100%;
          text-align: center;
        }
        .btn-base:active {
          transform: scale(0.97);
        }

        .btn-ghost {
          background-color: #1e2330;
          border: 1px solid #2a3040;
          color: #edeff4;
        }
        .btn-ghost:hover {
          background-color: #252b3b;
          border-color: #384259;
          color: #ffffff;
        }

        .btn-indigo {
          background: linear-gradient(135deg, #5b6ef5 0%, #4655d9 100%);
          border: 1px solid #5b6ef5;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(91, 110, 245, 0.35);
        }
        .btn-indigo:hover {
          background: linear-gradient(135deg, #6b7df7 0%, #5161e5 100%);
          box-shadow: 0 6px 18px rgba(91, 110, 245, 0.5);
        }

        .btn-emerald {
          background: linear-gradient(135deg, #2bd576 0%, #20b863 100%);
          border: 1px solid #2bd576;
          color: #0d1017;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(43, 213, 118, 0.25);
        }
        .btn-emerald:hover {
          background: linear-gradient(135deg, #37e382 0%, #25c56b 100%);
          box-shadow: 0 6px 18px rgba(43, 213, 118, 0.4);
        }

        /* Inputs & Selects */
        .console-input {
          background-color: #1e2330;
          border: 1px solid #2a3040;
          border-radius: 8px;
          color: #edeff4;
          padding: 10px 12px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          font-size: 13px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .console-input:focus {
          border-color: #2bd576;
          box-shadow: 0 0 0 2px rgba(43, 213, 118, 0.2);
        }

        /* Cursor animation */
        @keyframes blinkCursor {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
        .blinking-cursor {
          display: inline-block;
          width: 8px;
          height: 15px;
          background-color: #2bd576;
          margin-left: 6px;
          vertical-align: middle;
          animation: blinkCursor 1s infinite;
        }
      `}</style>

      {/* Main Container */}
      <div className="w-full space-y-4 sm:space-y-[18px]">
        {/* 1. HEADER CARD */}
        <div className="relative overflow-hidden rounded-[12px] border border-[#232838] bg-gradient-to-br from-[#171b26] to-[#10131c] p-4 sm:p-7 shadow-xl">
          {/* Top 2px edge accent strip: indigo -> emerald -> amber */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#5B6EF5] via-[#2BD576] to-[#F5A524]" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Header info */}
            <div className="space-y-2">
              {/* Mono Tag */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#5B6EF5]/40 bg-[#5B6EF5]/10 px-2.5 py-0.5 text-[10.5px] font-mono-code text-[#5B6EF5]">
                <MonitorIcon />
                <span>WINDOWS DESKTOP · .EXE</span>
              </div>

              {/* H1 Title */}
              <h1 className="font-space text-xl sm:text-2xl lg:text-[28px] font-semibold text-[#EDEFF4] tracking-tight leading-tight">
                Desktop Setup & License Manager
              </h1>

              {/* Muted description */}
              <p className="text-xs sm:text-[13.5px] text-[#8A93A6] max-w-2xl leading-relaxed">
                Package the native Windows client, protect it with an activation key, and keep offline VFP data in sync — all from one place.
              </p>
            </div>

            {/* Right Header Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
              <button
                onClick={handleRefresh}
                className="btn-base btn-ghost text-xs px-4 py-2.5 w-full sm:w-auto"
                title="Refresh Package Status"
              >
                <RefreshIcon spinning={refreshing} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleDownload}
                className="btn-base btn-indigo text-xs px-4 py-2.5 w-full sm:w-auto"
              >
                {downloading ? <SpinnerIcon /> : <DownloadIcon />}
                <span className="truncate">{downloading ? "Downloading..." : "Download .exe"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. TWO-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 sm:gap-[18px]">
          {/* LEFT CARD — "Application Package Status" */}
          <div className="console-card flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2BD576]/10 border border-[#2BD576]/20 text-[#2BD576] shrink-0">
                    <PackageIcon />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-space text-sm sm:text-base font-semibold text-[#EDEFF4] leading-tight truncate">
                      Application Package Status
                    </h2>
                    <p className="text-[11px] text-[#8A93A6] mt-0.5 truncate">
                      Windows 10 / 11 · 64-bit target
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-mono-code font-semibold border shrink-0 self-start sm:self-auto ${
                    buildStatus === "ready"
                      ? "bg-[#2BD576]/10 border-[#2BD576]/30 text-[#2BD576]"
                      : "bg-[#F5A524]/10 border-[#F5A524]/30 text-[#F5A524]"
                  }`}
                >
                  <span
                    className={`pulse-dot ${
                      buildStatus === "ready" ? "pulse-dot-emerald" : "pulse-dot-amber"
                    }`}
                  />
                  <span>
                    {buildStatus === "ready" ? "Build ready" : "Build needed"}
                  </span>
                </div>
              </div>

              {/* Metadata List */}
              <div className="border-t border-[#232838] pt-3.5 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[#8A93A6]">Target file:</span>
                  <span className="font-mono-code text-[#EDEFF4] truncate text-[11px] sm:text-xs">
                    Mabsol Pharma CRM Setup.exe
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[#8A93A6]">File size:</span>
                  <span className="font-mono-code text-[#EDEFF4] text-[11px] sm:text-xs">~96 MB</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[#8A93A6]">Package format:</span>
                  <a
                    href="#download"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownload();
                    }}
                    className="font-mono-code text-[#5B6EF5] hover:underline truncate text-[11px] sm:text-xs"
                  >
                    NSIS Setup Installer (.exe)
                  </a>
                </div>
              </div>

              {/* Terminal Window */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono-code font-semibold tracking-wider text-[#565f73] uppercase">
                  BUILD COMMAND
                </span>
                <div className="overflow-hidden rounded-lg border border-[#2A3040] bg-[#0A0C12] w-full">
                  {/* Dark Chrome Bar */}
                  <div className="flex items-center justify-between bg-[#12151d] px-3 py-2 border-b border-[#1E2330]">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
                    </div>
                    <span className="font-mono-code text-[10px] text-[#565f73] truncate px-1">
                      package build
                    </span>
                    <button
                      onClick={() => handleCopy("npm run electron:dist", "terminalCmd")}
                      className="inline-flex items-center gap-1 text-[10.5px] font-mono-code text-[#8A93A6] hover:text-[#EDEFF4] transition shrink-0"
                    >
                      {copiedId === "terminalCmd" ? (
                        <span className="text-[#2BD576] flex items-center gap-1">
                          <CheckIcon /> Copied
                        </span>
                      ) : (
                        <>
                          <CopyIcon /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Terminal Body */}
                  <div className="p-3 font-mono-code text-[11px] sm:text-xs flex items-center overflow-x-auto">
                    <span className="text-[#5B6EF5] font-bold mr-2 shrink-0">$</span>
                    <span className="text-[#2BD576] font-semibold whitespace-nowrap">npm run electron:dist</span>
                    <span className="blinking-cursor shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Download Button */}
            <button
              onClick={handleDownload}
              className="btn-base btn-indigo w-full py-3 text-xs sm:text-sm font-semibold mt-3"
            >
              {downloading ? <SpinnerIcon /> : <DownloadIcon />}
              <span className="truncate">
                {downloading ? "Starting Download..." : "Download Desktop Setup (.exe)"}
              </span>
            </button>
          </div>

          {/* RIGHT CARD — "Product Key Generator" */}
          <div className="console-card flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Header row */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2BD576]/10 border border-[#2BD576]/20 text-[#2BD576] shrink-0">
                  <KeyIcon />
                </div>
                <div className="min-w-0">
                  <h2 className="font-space text-sm sm:text-base font-semibold text-[#EDEFF4] leading-tight truncate">
                    Product Key Generator
                  </h2>
                  <p className="text-[11px] text-[#8A93A6] mt-0.5 truncate">
                    Create activation keys for client installs
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleOpenGenerateModal} className="space-y-3 pt-1 w-full">
                {/* Field 1: Client Name */}
                <div className="space-y-1 w-full">
                  <label className="block text-[11.5px] font-medium text-[#8A93A6]">
                    Client / business name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="console-input"
                    placeholder="Enter client name..."
                    required
                  />
                </div>

                {/* Field 2: License Period Select */}
                <div className="space-y-1 w-full">
                  <label className="block text-[11.5px] font-medium text-[#8A93A6]">
                    License period
                  </label>
                  <div className="relative w-full">
                    <select
                      value={licensePeriod}
                      onChange={(e) => setLicensePeriod(e.target.value)}
                      className="console-input appearance-none pr-8 cursor-pointer"
                    >
                      <option value="1 Year CRM Access">1 Year CRM Access</option>
                      <option value="2 Year CRM Access">2 Year CRM Access</option>
                      <option value="Perpetual License">Perpetual License</option>
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8A93A6]">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  className="btn-base btn-emerald w-full py-2.5 text-xs font-bold mt-1"
                >
                  <KeyIcon />
                  <span className="truncate">Generate product key (Requires Email OTP)</span>
                </button>
              </form>

              {/* Default Master Key Box */}
              <div className="space-y-1.5 pt-1 w-full">
                <span className="text-[10px] font-mono-code font-semibold tracking-wider text-[#565f73] uppercase">
                  DEFAULT MASTER ACTIVATION KEY
                </span>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2BD576]/30 bg-[#1E2330] p-2.5 w-full">
                  <span
                    className={`font-mono-code text-[11px] sm:text-xs font-semibold text-[#2BD576] truncate transition-opacity duration-150 ${
                      keyAnimating ? "opacity-30" : "opacity-100"
                    }`}
                  >
                    {generatedKey}
                  </span>
                  <button
                    onClick={() => handleCopy(generatedKey, "masterKey")}
                    className="inline-flex items-center gap-1 font-mono-code text-[10.5px] text-[#8A93A6] hover:text-[#EDEFF4] transition shrink-0"
                  >
                    {copiedId === "masterKey" ? (
                      <span className="text-[#2BD576] flex items-center gap-1">
                        <CheckIcon /> Copied
                      </span>
                    ) : (
                      <>
                        <CopyIcon /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. STEP RAIL CARD — "Installation guide" */}
        <div className="console-card space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5B6EF5]/10 border border-[#5B6EF5]/20 text-[#5B6EF5] shrink-0">
              <ShieldIcon />
            </div>
            <div>
              <h2 className="font-space text-sm sm:text-base font-semibold text-[#EDEFF4] leading-tight">
                Installation guide
              </h2>
              <p className="text-[11px] text-[#8A93A6] mt-0.5">
                Four steps, start to finish
              </p>
            </div>
          </div>

          {/* 4-Step Rail Grid */}
          <div className="relative">
            {/* Dashed Connecting Line behind circles (lg screens only) */}
            <div className="hidden lg:block absolute top-4 left-[10%] right-[10%] h-[1px] border-t border-dashed border-[#2A3040] z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
              {/* Step 01 */}
              <div className="group space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161A23] border border-[#2A3040] font-mono-code text-xs font-semibold text-[#EDEFF4] group-hover:border-[#5B6EF5] transition duration-200 shadow-sm">
                  01
                </div>
                <h3 className="font-space text-xs sm:text-sm font-semibold text-[#EDEFF4]">
                  Download
                </h3>
                <p className="text-[11.5px] text-[#8A93A6] leading-relaxed">
                  Get the .exe setup file onto the target Windows computer.
                </p>
              </div>

              {/* Step 02 */}
              <div className="group space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161A23] border border-[#2A3040] font-mono-code text-xs font-semibold text-[#EDEFF4] group-hover:border-[#5B6EF5] transition duration-200 shadow-sm">
                  02
                </div>
                <h3 className="font-space text-xs sm:text-sm font-semibold text-[#EDEFF4]">
                  Install
                </h3>
                <p className="text-[11.5px] text-[#8A93A6] leading-relaxed">
                  Run Mabsol Pharma CRM Setup.exe and follow the installer prompts.
                </p>
              </div>

              {/* Step 03 */}
              <div className="group space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161A23] border border-[#2A3040] font-mono-code text-xs font-semibold text-[#EDEFF4] group-hover:border-[#5B6EF5] transition duration-200 shadow-sm">
                  03
                </div>
                <h3 className="font-space text-xs sm:text-sm font-semibold text-[#EDEFF4]">
                  Activate
                </h3>
                <p className="text-[11.5px] text-[#8A93A6] leading-relaxed">
                  Enter the product activation key on the app's startup screen.
                </p>
              </div>

              {/* Step 04 */}
              <div className="group space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161A23] border border-[#2A3040] font-mono-code text-xs font-semibold text-[#EDEFF4] group-hover:border-[#5B6EF5] transition duration-200 shadow-sm">
                  04
                </div>
                <h3 className="font-space text-xs sm:text-sm font-semibold text-[#EDEFF4]">
                  Enjoy
                </h3>
                <p className="text-[11.5px] text-[#8A93A6] leading-relaxed">
                  Start managing your pharma CRM from the desktop app.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* EMAIL + OTP MODAL FOR WEBSITE KEY GENERATION */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-[#2A3040] bg-[#161A23] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#2BD576]">
                  <KeyIcon />
                  <h3 className="font-space text-base font-semibold text-[#EDEFF4]">
                    Verify Admin to Generate Key
                  </h3>
                </div>
                <button
                  onClick={() => setShowOtpModal(false)}
                  className="text-[#8A93A6] hover:text-[#EDEFF4] text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#8A93A6]">
                To generate or modify activation keys, verify your registered admin email with a 6-digit OTP code.
              </p>

              {otpError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {otpError}
                </div>
              )}

              {otpStep === "email" ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#8A93A6]">
                      Admin Email Address
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="console-input"
                      required
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="btn-base btn-indigo w-full py-2.5 text-xs font-semibold"
                  >
                    {otpLoading ? <SpinnerIcon /> : "Send Verification OTP"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#8A93A6]">
                      6-Digit Verification OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="console-input font-mono-code tracking-[4px] text-center"
                      required
                    />
                  </div>
                  <button
                    onClick={handleVerifyOtpAndGenerate}
                    disabled={otpLoading}
                    className="btn-base btn-emerald w-full py-2.5 text-xs font-bold"
                  >
                    {otpLoading ? <SpinnerIcon /> : "Verify OTP & Generate Key"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. FOOTER */}
        <footer className="text-center py-2 text-[10.5px] font-mono-code text-[#565f73]">
          mabsol pharma crm · desktop client v2.4.0
        </footer>
      </div>
    </div>
  );
}
