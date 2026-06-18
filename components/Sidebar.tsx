"use client";

import Link from "next/link";
import {
    FaTachometerAlt,
    FaUsers,
    FaUserTie,
    FaCog,
    FaAddressBook,
    FaDatabase,
  } from "react-icons/fa";

export default function Sidebar({
  collapsed,
  mobile,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobile: boolean;
}) {
  return (
    <div
      className="bg-dark text-white"
      style={{
        width: mobile
          ? collapsed
            ? "0px"
            : "260px"
          : collapsed
          ? "80px"
          : "260px",
      
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        overflow: "hidden",
        transition: "all .3s ease",
        zIndex: 1050,
      }}
    >
      <div className="p-3">

        <h4 className="text-center">
            {collapsed ? "M" : "Mabsol CRM"}
        </h4>


        <hr />

        <ul className="nav flex-column">

        <li className="nav-item mb-3">
            <Link
                href="/dashboard"
                className="nav-link text-white d-flex align-items-center"
            >
                <FaTachometerAlt />

                {!collapsed && (
                <span className="ms-3">
                    Dashboard
                </span>
                )}
            </Link>
            </li>

            <li className="nav-item mb-3">
  <Link
    href="/user"
    className="nav-link text-white d-flex align-items-center"
  >
    <FaUsers />

    {!collapsed && (
      <span className="ms-3">
        Users
      </span>
    )}
  </Link>
</li>

<li className="nav-item mb-3">
  <Link
    href="/leads"
    className="nav-link text-white d-flex align-items-center"
  >
    <FaAddressBook />

    {!collapsed && (
      <span className="ms-3">
        Leads
      </span>
    )}
  </Link>
</li>

<li className="nav-item mb-3">
  <Link
    href="/customers"
    className="nav-link text-white d-flex align-items-center"
  >
    <FaUserTie />

    {!collapsed && (
      <span className="ms-3">
        Customers
      </span>
    )}
  </Link>
</li>

<li className="nav-item mb-3">
  <Link
    href="/settings"
    className="nav-link text-white d-flex align-items-center"
  >
    <FaCog />

    {!collapsed && (
      <span className="ms-3">
        Settings
      </span>
    )}
  </Link>
</li>

<li className="nav-item mb-3">
  <Link
    href="/dashboard/vfp"
    className="nav-link text-white d-flex align-items-center"
  >
    <FaDatabase />

    {!collapsed && (
      <span className="ms-3">
        VFP
      </span>
    )}
  </Link>
</li>

        </ul>

      </div>
    </div>
  );
}
