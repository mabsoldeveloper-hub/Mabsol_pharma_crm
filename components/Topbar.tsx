"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, List, PersonCircle } from "react-bootstrap-icons";

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

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [fyList, setFyList] = useState<any[]>([]);
  const [selectedFY, setSelectedFY] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string>("");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
    fetch("/api/financial-year")
      .then((res) => res.json())
      .then((data) => {
        setFyList(data);
        const currentFY = data.find((x: any) => x.isCurrent);
        if (currentFY) setSelectedFY(currentFY);
      })
      .catch(() => { });
  }, []);

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
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLiveNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Poll notifications every 20 seconds
    return () => clearInterval(interval);
  }, []);

  const markAllRead = () => {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).then(() => fetchNotifications());
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
      className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm sticky top-0"
      style={{ zIndex: 999 }}
    >
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shrink-0"
        >
          <List size={18} />
        </button>

        {!mobile && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center rounded-lg bg-blue-100 text-blue-700 px-3 py-1.5 text-[13px] font-semibold truncate max-w-[220px]">
              {companyName || "Select Company"}
            </span>

            {selectedFY?.fyName && (
              <span className="inline-flex items-center rounded-lg bg-emerald-100 text-emerald-700 px-3 py-1.5 text-[13px] font-semibold">
                {selectedFY.fyName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 shrink-0">
        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-white border border-gray-200/90 shadow-2xl py-2 z-[1100] overflow-hidden backdrop-blur-xl">
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
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto text-[11px] font-extrabold bg-slate-50/60 no-scrollbar">
                {[
                  { id: "ALL", label: "All" },
                  { id: "FINANCIAL", label: "Payments 💰" },
                  { id: "TARGETS", label: "Targets 🎯" },
                  { id: "INVENTORY", label: "Stock 📦" },
                  { id: "ORDERS", label: "Orders 🛒" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(cat.id)}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
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
                        className={`px-3.5 py-3 text-[13px] cursor-pointer transition-all duration-150 flex gap-2.5 items-start ${
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
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white pl-2 pr-3 h-10 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-sm shrink-0 bg-white">
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
    </div>
  );
}
