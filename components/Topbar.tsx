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
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-gray-200 shadow-xl py-2 z-[1100] max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between px-3 pb-2 mb-1 text-[12px] font-semibold text-gray-500 border-b border-gray-100">
                <span>Notifications ({unreadCount} new)</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-600 hover:underline font-normal"
                  >
                    Mark read
                  </button>
                )}
              </div>

              {liveNotifications.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-400">
                  No notifications available
                </div>
              ) : (
                liveNotifications.map((n, i) => (
                  <div
                    key={n._id || i}
                    className={`px-3 py-2.5 text-[13px] border-b border-gray-50 hover:bg-orange-50 transition-colors duration-150 ${
                      !n.isRead ? "bg-orange-50/40 font-medium" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-gray-800 text-xs truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-600 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
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
