"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, List, PersonCircle, Trash, CalendarEvent, Search, Building } from "react-bootstrap-icons";

import { useUser } from "@/context/UserContext";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import LogoutButton from "./LogoutButton";
import GlobalSearchModal from "./GlobalSearchModal";

export default function Topbar({
  collapsed,
  setCollapsed,
  mobile,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobile: boolean;
}) {
  const { user } = useUser();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();
  const { fyList, selectedFY, setSelectedFY } = useFinancialYear();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");

  // Dynamic Voice Assistant ("Hey [Name]") State & Listener
  const [assistantName, setAssistantName] = useState("Salim");
  const [autoVoiceStart, setAutoVoiceStart] = useState(false);
  const [wakewordEnabled, setWakewordEnabled] = useState(true);
  const [salimToast, setSalimToast] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const bgRecognitionRef = useRef<any>(null);

  // Load voice settings from localStorage & subscribe to real-time setting updates
  const loadVoiceSettings = () => {
    try {
      const saved = localStorage.getItem("mabsol_voice_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.assistantName) setAssistantName(parsed.assistantName);
        if (typeof parsed.wakewordEnabled === "boolean") setWakewordEnabled(parsed.wakewordEnabled);
      }
    } catch (e) {
      console.error("Error loading voice settings:", e);
    }
  };

  useEffect(() => {
    loadVoiceSettings();
    window.addEventListener("mabsol_voice_settings_updated", loadVoiceSettings);
    return () => window.removeEventListener("mabsol_voice_settings_updated", loadVoiceSettings);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !wakewordEnabled || searchOpen) {
      if (bgRecognitionRef.current) {
        try { bgRecognitionRef.current.abort(); } catch (e) {}
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    let isMounted = true;

    const startBgRecognition = () => {
      if (!isMounted || searchOpen || !wakewordEnabled) return;

      try {
        if (bgRecognitionRef.current) {
          try { bgRecognitionRef.current.abort(); } catch (e) {}
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "hi-IN";

        rec.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }

          const lower = transcript.toLowerCase();
          const targetName = (assistantName || "Salim").toLowerCase().trim();

          const isTriggered =
            lower.includes(targetName) ||
            lower.includes(`hey ${targetName}`) ||
            lower.includes(`hi ${targetName}`) ||
            lower.includes(`hello ${targetName}`) ||
            (targetName === "salim" && (lower.includes("saliem") || lower.includes("saleem") || lower.includes("selim")));

          if (isTriggered) {
            console.log(`${assistantName} Wake-Word Triggered:`, transcript);
            try { rec.abort(); } catch (e) {}

            setSalimToast(true);
            setTimeout(() => setSalimToast(false), 3500);

            setAutoVoiceStart(true);
            setSearchOpen(true);
          }
        };

        rec.onerror = (event: any) => {
          if (event.error === "not-allowed") {
            console.warn(`Mic access denied for ${assistantName} Wake-Word background listener.`);
          }
        };

        rec.onend = () => {
          if (isMounted && wakewordEnabled && !searchOpen) {
            setTimeout(() => {
              if (isMounted && wakewordEnabled && !searchOpen) {
                startBgRecognition();
              }
            }, 800);
          }
        };

        bgRecognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.warn("Background Salim listener error:", e);
      }
    };

    startBgRecognition();

    return () => {
      isMounted = false;
      if (bgRecognitionRef.current) {
        try { bgRecognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [wakewordEnabled, searchOpen, assistantName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const raw = user?.companyId as any;

    if (raw && typeof raw === "object" && raw.companyName) {
      setCompanyName(raw.companyName);
      return;
    }

    const rawId = typeof raw === "string" ? raw : raw?._id;
    if (!rawId) return;

    fetch("/api/company-master")
      .then((res) => res.json())
      .then((companies: any[]) => {
        const match = companies?.find((c) => c._id === rawId);
        if (match?.companyName) setCompanyName(match.companyName);
      })
      .catch(() => { });
  }, [user]);


  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.notifications)) {
          setLiveNotifications(data.notifications);
        }
      })
      .catch((err) => console.error("Notifications fetch error:", err));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = liveNotifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).then(() => fetchNotifications());
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setLiveNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const clearAllNotifications = async () => {
    setLiveNotifications([]);
    try {
      await fetch("/api/notifications?clearAll=true", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const [activeCat, setActiveCat] = useState<string>("ALL");

  const filteredNotifications = liveNotifications.filter((n) => {
    if (activeCat === "ALL") return true;
    return (n.category || "SYSTEM").toUpperCase() === activeCat;
  });

  const handleNotifClick = (n: any) => {
    if (!n.isRead && n._id) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: n._id }),
      }).then(() => fetchNotifications());
    }
    setNotifOpen(false);
    if (n.actionUrl) {
      window.location.href = n.actionUrl;
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 shadow-xs sticky top-0 transition-all"
      style={{ zIndex: 999 }}
    >
      {/* LEFT: Sidebar Toggle & Company/FY Selectors */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shrink-0 cursor-pointer shadow-xs"
        >
          <List size={16} className="sm:hidden" />
          <List size={18} className="hidden sm:block" />
        </button>

        {/* DESKTOP COMPANY & FY SELECTORS */}
        {!mobile ? (
          <div className="flex items-center gap-2 min-w-0">
            {/* COMPANY SELECTOR DROPDOWN */}
            <div className="relative inline-flex items-center">
              <div className="absolute left-2.5 text-blue-600 pointer-events-none">
                <Building size={13} />
              </div>
              <select
                value={selectedCompany?._id || ""}
                onChange={(e) => {
                  const comp = companies.find((c) => c._id === e.target.value);
                  if (comp) setSelectedCompany(comp);
                }}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-[13px] font-bold border border-blue-200 dark:border-blue-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs transition-all max-w-[210px] lg:max-w-[240px] truncate"
                title="Select Active Company"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id} className="text-slate-900 font-medium">
                    {c.companyName} ({c.companyCode || "Code"})
                  </option>
                ))}
              </select>
            </div>

            {/* FINANCIAL YEAR SELECTOR DROPDOWN */}
            <div className="relative inline-flex items-center">
              <div className="absolute left-2.5 text-emerald-600 pointer-events-none">
                <CalendarEvent size={13} />
              </div>
              <select
                value={selectedFY?._id || ""}
                onChange={(e) => {
                  const fy = fyList.find((x) => x._id === e.target.value);
                  if (fy) setSelectedFY(fy);
                }}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[13px] font-bold border border-emerald-200 dark:border-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs transition-all max-w-[210px] lg:max-w-[240px] truncate"
                title="Select Financial Year"
              >
                {fyList.map((fy) => (
                  <option key={fy._id} value={fy._id} className="text-slate-900 font-medium">
                    {fy.isAll
                      ? fy.fyName
                      : fy.fyCode
                      ? `${fy.fyCode} - FY ${fy.fyName}`
                      : `FY ${fy.fyName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* MOBILE COMPACT COMPANY & FY SELECTORS */
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Mobile Company Select */}
            <div className="relative inline-flex items-center flex-1 min-w-0 max-w-[130px] xs:max-w-[150px]">
              <div className="absolute left-1.5 text-blue-600 pointer-events-none">
                <Building size={11} />
              </div>
              <select
                value={selectedCompany?._id || ""}
                onChange={(e) => {
                  const comp = companies.find((c) => c._id === e.target.value);
                  if (comp) setSelectedCompany(comp);
                }}
                className="w-full pl-5 pr-1.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 text-[10px] font-bold border border-blue-200 dark:border-blue-800/60 focus:outline-none cursor-pointer truncate"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id} className="text-slate-900">
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile FY Select */}
            <div className="relative inline-flex items-center flex-1 min-w-0 max-w-[110px] xs:max-w-[130px]">
              <div className="absolute left-1.5 text-emerald-600 pointer-events-none">
                <CalendarEvent size={11} />
              </div>
              <select
                value={selectedFY?._id || ""}
                onChange={(e) => {
                  const fy = fyList.find((x) => x._id === e.target.value);
                  if (fy) setSelectedFY(fy);
                }}
                className="w-full pl-5 pr-1.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/60 focus:outline-none cursor-pointer truncate"
              >
                {fyList.map((fy) => (
                  <option key={fy._id} value={fy._id} className="text-slate-900">
                    {fy.isAll
                      ? "All FYs"
                      : fy.fyCode
                      ? `${fy.fyCode}`
                      : `FY ${fy.fyName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* CENTER GLOBAL SEARCH TRIGGER (Desktop / Tablet) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50/60 hover:border-indigo-200 text-slate-500 transition-all text-xs font-semibold shadow-xs group cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={15} className="text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate text-slate-500 dark:text-slate-300 group-hover:text-indigo-900 dark:group-hover:text-indigo-200 font-medium">Search links, products, stock, customers, invoices...</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              onClick={(e) => {
                e.stopPropagation();
                setAutoVoiceStart(true);
                setSearchOpen(true);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold border rounded-md shadow-2xs transition-colors cursor-pointer ${
                wakewordEnabled
                  ? "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                  : "text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200"
              }`}
              title={wakewordEnabled ? `Click or say 'Hey ${assistantName}' to activate ${assistantName} AI` : `${assistantName} Wake-Word Disabled (Click to open Voice AI)`}
            >
              🎙️ {assistantName} AI {wakewordEnabled ? `("Hey ${assistantName}")` : "(Off)"}
            </span>
            <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-extrabold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
              <span className="text-[9px]">Ctrl</span> K
            </kbd>
          </div>
        </button>
      </div>

      {/* RIGHT: Search Icon, Notifications & Profile */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* MOBILE GLOBAL SEARCH ICON BUTTON */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Global Search"
          className="flex md:hidden items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors duration-200 shrink-0 cursor-pointer shadow-xs"
          title="Search Anything (Products, Customers, Invoices, MRs...)"
        >
          <Search size={15} />
        </button>

        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-colors duration-200"
          >
            <Bell size={15} className="sm:hidden" />
            <Bell size={18} className="hidden sm:block" />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="fixed left-2 right-2 sm:left-auto sm:right-0 top-14 sm:top-auto sm:mt-2 sm:w-96 max-w-[380px] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 shadow-2xl py-2 z-[1100] overflow-hidden backdrop-blur-xl transition-all">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 text-xs">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-black">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                  {liveNotifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Chips: Targets & Stock only */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 overflow-x-auto text-[11px] font-extrabold bg-slate-50/60 no-scrollbar">
                {[
                  { id: "ALL", label: "All Alerts" },
                  { id: "TARGETS", label: "Targets 🎯" },
                  { id: "INVENTORY", label: "Stock & Expiry 📦" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(cat.id)}
                    className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all ${
                      activeCat === cat.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {filteredNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-400 font-semibold">
                    No notifications in this category
                  </div>
                ) : (
                  filteredNotifications.map((n, i) => {
                    const isErr = n.severity === "error";
                    const isWarn = n.severity === "warning";
                    const isSucc = n.severity === "success";

                    return (
                      <div
                        key={n._id || i}
                        onClick={() => handleNotifClick(n)}
                        className={`group px-3.5 py-3 text-[13px] cursor-pointer transition-all duration-150 flex gap-2.5 items-start ${
                          !n.isRead ? "bg-indigo-50/30 hover:bg-indigo-50/60 font-medium" : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Status Icon */}
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            isErr
                              ? "bg-rose-500 ring-4 ring-rose-100"
                              : isWarn
                              ? "bg-amber-500 ring-4 ring-amber-100"
                              : isSucc
                              ? "bg-emerald-500 ring-4 ring-emerald-100"
                              : "bg-indigo-500 ring-4 ring-indigo-100"
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-800 text-xs truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                              {n.createdAt
                                ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : ""}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>

                        {/* Individual Remove Button */}
                        <button
                          onClick={(e) => deleteNotification(n._id, e)}
                          title="Delete notification"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition-all shrink-0 ml-1.5 shadow-2xs flex items-center justify-center"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 sm:pl-2 sm:pr-3 h-8 sm:h-10 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            <span className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-gray-200 dark:border-slate-700 shadow-xs shrink-0 bg-white">
              <img
                src={user?.profilePhoto || "/avatar.png"}
                alt={user?.name || "User"}
                className="w-full h-full object-cover"
              />
            </span>

            {!mobile && (
              <span className="flex flex-col items-start leading-tight text-left">
                <span className="text-[13px] font-semibold">
                  {user?.name || "User"}
                </span>
                <span className="text-[11px] text-gray-500">
                  {user?.roleId?.roleName || "—"}
                </span>
              </span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-lg py-2 z-[1100]">
              <a
                href="/dashboard/profile"
                className="block px-3 py-2 text-[13px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-150"
              >
                My Profile
              </a>

              <a
                href="/dashboard/settings"
                className="block px-3 py-2 text-[13px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-150"
              >
                Settings
              </a>

              <div className="my-1 border-t border-gray-100" />

              <div className="px-3 py-1">
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Assistant Activated Toast Banner */}
      {salimToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950 text-white text-xs font-bold shadow-2xl border border-indigo-500/50 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span>🎙️ {assistantName} Voice Assistant Activated! (&quot;Hey {assistantName}&quot; detected)</span>
        </div>
      )}

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        autoVoiceStart={autoVoiceStart}
        onVoiceStartHandled={() => setAutoVoiceStart(false)}
      />
    </div>
  );
}
