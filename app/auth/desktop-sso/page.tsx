"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function DesktopSsoContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "need_login">("loading");
  const [deepLinkUrl, setDeepLinkUrl] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`/api/auth/me?_t=${Date.now()}`);
        const data = await res.json();

        if (res.ok && data.success && data.user) {
          setUser(data.user);
          
          const tokenRes = await fetch("/api/auth/desktop-token", { method: "POST" });
          const tokenData = await tokenRes.json();

          if (tokenData.success && tokenData.token) {
            const protocolUrl = `mabsolcrm://auth-callback?token=${encodeURIComponent(tokenData.token)}&user=${encodeURIComponent(data.user.name || "User")}`;
            setDeepLinkUrl(protocolUrl);
            setStatus("success");
            
            setTimeout(() => {
              window.location.href = protocolUrl;
            }, 600);
          } else {
            setStatus("need_login");
          }
        } else {
          setStatus("need_login");
        }
      } catch (err) {
        setStatus("need_login");
      }
    }

    checkAuth();
  }, []);

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
      {/* Brand Header */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457-.39-2.823-1.07-4" />
          </svg>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Mabsol Pharma CRM</h1>
        <p className="text-sm text-slate-400 mt-1">Desktop App SSO Authentication</p>
      </div>

      {status === "loading" && (
        <div className="py-6 space-y-3">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Verifying session, please wait...</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-5 py-2">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm">
            ✓ Authentication Completed Successfully!
          </div>
          <p className="text-xs text-slate-400">
            Welcome back, <strong className="text-slate-200">{user?.name}</strong>. Returning to the desktop app...
          </p>

          {deepLinkUrl && (
            <a
              href={deepLinkUrl}
              className="block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition"
            >
              Open Mabsol Pharma CRM App
            </a>
          )}

          <p className="text-[11px] text-slate-500">
            If the desktop app doesn't open automatically, click the button above. You can close this browser tab anytime.
          </p>
        </div>
      )}

      {status === "need_login" && (
        <div className="space-y-4 py-2">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-xs leading-relaxed">
            Please log in to your Mabsol Pharma CRM cloud account first to authorize the desktop application.
          </div>
          <a
            href={`/login?redirect=${encodeURIComponent("/auth/desktop-sso")}`}
            className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-500 transition"
          >
            Sign In to Cloud Account
          </a>
        </div>
      )}
    </div>
  );
}

export default function DesktopSsoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <Suspense fallback={
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Loading Desktop SSO...
        </div>
      }>
        <DesktopSsoContent />
      </Suspense>
    </div>
  );
}
