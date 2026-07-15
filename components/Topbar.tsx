"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, List, Moon, PersonCircle, Sun } from "react-bootstrap-icons";

import { useUser } from "@/context/UserContext";
import LogoutButton from "./LogoutButton";

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

  const [darkMode, setDarkMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [fyList, setFyList] = useState<any[]>([]);
  const [selectedFY, setSelectedFY] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string>("");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // ---------------- Company name ----------------
  // user.companyId can either be a populated object ({ _id, companyName })
  // or just a raw ObjectId string, depending on how the /me (login) API
  // built the user object. Handle both so the badge never shows blank.
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

  // ---------------- Dark mode: initialise from storage, toggle the <html> class ----------------
  // Tailwind's dark: variants only react to a "dark" class on <html> (darkMode: "class"),
  // so we sync that here instead of a custom "dark-mode" class on <body>.
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // ---------------- Financial year ----------------
  useEffect(() => {
    fetch("/api/financial-year")
      .then((res) => res.json())
      .then((data) => {
        setFyList(data);
        const currentFY = data.find((x: any) => x.isCurrent);
        if (currentFY) setSelectedFY(currentFY);
      })
      .catch(() => { });
  }, []);

  // ---------------- Close dropdowns on outside click ----------------
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const notifications = [
    { label: "New Lead Assigned", time: "2m ago" },
    { label: "New Customer Added", time: "1h ago" },
    { label: "Payment Received", time: "3h ago" },
  ];

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 bg-[#F5F6FA] dark:bg-[#14162c] border-b border-[#E4E6EF] dark:border-white/10 shadow-sm sticky top-0"
      style={{ zIndex: 999 }}
    >
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#343872] text-white hover:bg-[#2b2f5f] transition-colors duration-200 shrink-0"
        >
          <List size={18} />
        </button>

        {!mobile && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center rounded-lg bg-[#343872]/10 dark:bg-[#343872]/30 text-[#343872] dark:text-white px-3 py-1.5 text-[13px] font-semibold truncate max-w-[220px]">
              {companyName || "Select Company"}
            </span>

            {selectedFY?.fyName && (
              <span className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 text-[13px] font-semibold">
                {selectedFY.fyName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 shrink-0">
        {/* DARK MODE */}
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#E4E6EF] dark:border-white/10 text-gray-500 dark:text-gray-300 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] transition-colors duration-200"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-[#E4E6EF] dark:border-white/10 text-gray-500 dark:text-gray-300 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] transition-colors duration-200"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#1c1f3a] border border-gray-100 dark:border-white/10 shadow-lg py-2 z-[1100]">
              <div className="px-3 pb-2 mb-1 text-[12px] font-semibold text-gray-400 border-b border-gray-100 dark:border-white/10">
                Notifications
              </div>
              {notifications.map((n, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex items-center justify-between px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] transition-colors duration-150"
                >
                  <span className="truncate">{n.label}</span>
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">{n.time}</span>
                </a>
              ))}
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
            className="flex items-center gap-2 rounded-xl border border-[#E4E6EF] dark:border-white/10 pl-2 pr-3 h-10 text-gray-600 dark:text-gray-200 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] transition-colors duration-200"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#343872] text-white shrink-0">
              <PersonCircle size={16} />
            </span>
            {!mobile && (
              <span className="flex flex-col items-start leading-tight text-left">
                <span className="text-[13px] font-semibold">{user?.name || "User"}</span>
                <span className="text-[11px] text-gray-400">{user?.roleId?.roleName || "—"}</span>
              </span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#1c1f3a] border border-gray-100 dark:border-white/10 shadow-lg py-2 z-[1100]">
              <a
                href="/dashboard/profile"
                className="block px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] transition-colors duration-150"
              >
                My Profile
              </a>
              <a
                href="/dashboard/settings"
                className="block px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] transition-colors duration-150"
              >
                Settings
              </a>
              <div className="my-1 border-t border-gray-100 dark:border-white/10" />
              <div className="px-3 py-1">
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}