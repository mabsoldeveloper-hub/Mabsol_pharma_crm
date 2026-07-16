
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
    console.log("USER =>", user);
    console.log("COMPANY ID =>", user?.companyId);
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

  const notifications = [
    { label: "New Lead Assigned", time: "2m ago" },
    { label: "New Customer Added", time: "1h ago" },
    { label: "Payment Received", time: "3h ago" },
  ];

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

            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-gray-200 shadow-lg py-2 z-[1100]">
              <div className="px-3 pb-2 mb-1 text-[12px] font-semibold text-gray-400 border-b border-gray-100">
                Notifications
              </div>

              {notifications.map((n, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex items-center justify-between px-3 py-2 text-[13px] text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150"
                >
                  <span className="truncate">{n.label}</span>
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                    {n.time}
                  </span>
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
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white pl-2 pr-3 h-10 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white shrink-0">
              <PersonCircle size={16} />
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

