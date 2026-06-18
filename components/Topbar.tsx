"use client";

//import { useState } from "react";
import {
  Bell,
  Moon,
  Sun,
  PersonCircle,
} from "react-bootstrap-icons";
import { useEffect, useState } from "react";

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

  const [darkMode, setDarkMode] =
    useState(
      () =>
        typeof window !== "undefined" &&
        localStorage.getItem("theme") === "dark"
    );

    useEffect(() => {
        if (darkMode) {
          document.body.classList.add("dark-mode");
          localStorage.setItem("theme", "dark");
        } else {
          document.body.classList.remove("dark-mode");
          localStorage.setItem("theme", "light");
        }
      }, [darkMode]);

  return (
    <div
      className="bg-white border-bottom px-3 py-3 d-flex justify-content-between align-items-center shadow-sm"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
      }}
    >
      {/* LEFT */}

      <div className="d-flex align-items-center gap-3">

        <button
          className="btn btn-dark"
          onClick={() =>
            setCollapsed(!collapsed)
          }
        >
          ☰
        </button>

        {!mobile && (
          <h5
            className="mb-0 fw-bold"
            style={{
              color: "#0f172a",
            }}
          >
            
          </h5>
        )}
      </div>

      {/* RIGHT */}

      <div className="d-flex align-items-center gap-3">

        {/* DARK MODE */}

        <button
          className="btn btn-light border"
          onClick={() => {

            const newMode = !darkMode;
          
            setDarkMode(newMode);
          }}
        >
          {darkMode ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>

        {/* NOTIFICATION */}

        <div className="dropdown">

          <button
            className="btn btn-light border position-relative"
            data-bs-toggle="dropdown"
          >
            <Bell size={20} />

            <span
              className="badge bg-danger position-absolute"
              style={{
                top: "-5px",
                right: "-5px",
              }}
            >
              5
            </span>
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow">

            <li>
              <a
                className="dropdown-item"
                href="#"
              >
                New Lead Assigned
              </a>
            </li>

            <li>
              <a
                className="dropdown-item"
                href="#"
              >
                New Customer Added
              </a>
            </li>

            <li>
              <a
                className="dropdown-item"
                href="#"
              >
                Payment Received
              </a>
            </li>

          </ul>

        </div>

        {/* PROFILE */}

        <div className="dropdown">

          <button
            className="btn btn-light border d-flex align-items-center gap-2"
            data-bs-toggle="dropdown"
          >
            <PersonCircle size={24} />

            {!mobile && (
              <span>
                Company Admin
              </span>
            )}
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow">

            <li>
            <a
  className="dropdown-item"
  href="/profile"
>
  My Profile
</a>
            </li>

            <li>
              <a
                className="dropdown-item"
                href="/settings"
              >
                Settings
              </a>
            </li>

            <li>
              <hr className="dropdown-divider" />
            </li>

            <li className="px-3">
              <LogoutButton />
            </li>

          </ul>

        </div>

      </div>
    </div>
  );
}
