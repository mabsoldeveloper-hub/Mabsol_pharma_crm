"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const isMobile = window.innerWidth < 992;
  
      setMobile(isMobile);
  
      if (isMobile) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
  
    checkScreen();
  
    window.addEventListener("resize", checkScreen);
  
    return () =>
      window.removeEventListener(
        "resize",
        checkScreen
      );
  }, []);

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobile={mobile}
      />

{!collapsed && mobile && (
  <div
    onClick={() => setCollapsed(true)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      zIndex: 1040,
    }}
  />
)}

        <div
        style={{
          marginLeft: mobile
            ? "0"
            : collapsed
            ? "76px"
            : "260px",

          width: mobile
            ? "100%"
            : collapsed
            ? "calc(100% - 76px)"
            : "calc(100% - 260px)",

          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: "100vh",
          overflowX: "hidden",
        }}
        >




<Topbar
  setCollapsed={setCollapsed}
  collapsed={collapsed}
  mobile={mobile}
/>

        <div className="container-fluid p-4">
          {children}
        </div>
      </div>
    </>
  );
}