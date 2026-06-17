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
      background: "rgba(0,0,0,.5)",
      zIndex: 1040,
    }}
  />
)}

        <div
        style={{
            marginLeft: mobile
            ? "0"
            : collapsed
            ? "80px"
            : "260px",

            width: mobile
            ? "100%"
            : collapsed
            ? "calc(100% - 80px)"
            : "calc(100% - 260px)",

            transition: "all .3s ease",
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