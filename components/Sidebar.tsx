"use client";
import PermissionGate from "@/components/PermissionGate";
import { usePermission } from "@/context/PermissionContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import {
  FaTachometerAlt,
  FaUsers,
  FaUserShield,
  FaUserTag,
  FaCog,
  FaBoxOpen,
  FaShoppingCart,
  FaFileInvoice,
  FaClipboardList,
  FaChartBar,
  FaChevronDown,
  FaChevronRight,
  FaBuilding,
  FaPlusCircle,
  FaListUl,
  FaCalendarAlt,
  FaExchangeAlt,
  FaSyncAlt,
  FaSlidersH,
  FaWarehouse,
  FaUserCircle,
} from "react-icons/fa";

type SidebarProps = {
  collapsed: boolean;
  setCollapsed?: (value: boolean) => void;
  mobile: boolean;
};

export default function Sidebar({ collapsed, setCollapsed, mobile }: SidebarProps) {
  const { can } = usePermission();
  const [crmOpen, setCrmOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [fyOpen, setFyOpen] = useState(false);
  const [vfpOpen, setVfpOpen] = useState(false);
  const pathname = usePathname();

  const [company, setCompany] = useState<any>(null);
  useEffect(() => {
    fetch("/api/company-master")
      .then((res) => res.json())
      .then((data) => setCompany(data))
      .catch(() => { });
  }, []);

  // Sidebar is "iconOnly" when collapsed on desktop. On mobile, collapsed just hides it entirely.
  const iconOnly = collapsed && !mobile;

  // ---------------- Single link (no submenu) ----------------
  const NavLink = ({
    href,
    icon,
    label,
    active,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
  }) => (
    <Link
      href={href}
      title={iconOnly ? label : ""}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-200 group ${iconOnly ? "justify-center px-0" : ""
        } ${active
          ? "bg-[#343872]/5 text-[#343872] font-semibold dark:bg-[#fb8c00]/10 dark:text-white"
          : "text-gray-500 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] dark:text-gray-400 dark:hover:text-[#fb8c00]"
        }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#343872] dark:bg-[#fb8c00]" />
      )}
      <span
        className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-[14px] transition-colors duration-200 ${active
            ? "bg-[#343872] text-white shadow-sm"
            : "bg-gray-100 text-[#343872] group-hover:bg-[#fb8c00] group-hover:text-white dark:bg-white/5 dark:text-gray-200"
          }`}
      >
        {icon}
      </span>
      {!iconOnly && <span className="truncate">{label}</span>}
    </Link>
  );

  // ---------------- Sub-link inside an expanded group ----------------
  const SubLink = ({
    href,
    icon,
    label,
    active,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
  }) => (
    <Link
      href={href}
      className={`group/sub flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-200 ${active
          ? "bg-[#343872]/5 text-[#343872] font-medium dark:bg-[#fb8c00]/10 dark:text-white"
          : "text-gray-500 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] dark:text-gray-400"
        }`}
    >
      <span
        className={`text-[12px] ${active ? "text-[#343872] dark:text-[#fb8c00]" : "text-gray-400 group-hover/sub:text-[#fb8c00]"
          }`}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );

  // ---------------- Collapsible group ----------------
  // When the sidebar is fully expanded, clicking toggles an inline accordion.
  // When the sidebar is icon-only, hovering the icon reveals a flyout panel
  // with the same submenu items — so functionality is never lost on collapse.
  const Group = ({
    icon,
    label,
    open,
    onClick,
    active,
    items,
  }: {
    icon: React.ReactNode;
    label: string;
    open: boolean;
    onClick: () => void;
    active: boolean;
    items: React.ReactNode;
  }) => (
    <li className={`group/nav relative ${iconOnly ? "flex justify-center" : ""}`}>
      <button
        title={iconOnly ? label : ""}
        onClick={onClick}
        className={`w-full flex items-center justify-between rounded-xl text-[13.5px] transition-all duration-200 group ${iconOnly ? "justify-center px-0 py-2.5 w-11" : "px-3 py-2.5"
          } ${active
            ? "text-[#343872] font-semibold dark:text-white"
            : "text-gray-500 hover:bg-[#fb8c00]/10 hover:text-[#fb8c00] dark:text-gray-400 dark:hover:text-[#fb8c00]"
          }`}
      >
        <span className={`flex items-center gap-3 ${iconOnly ? "" : ""}`}>
          <span
            className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-[14px] transition-colors duration-200 ${active
                ? "bg-[#343872] text-white shadow-sm"
                : "bg-gray-100 text-[#343872] group-hover:bg-[#fb8c00] group-hover:text-white dark:bg-white/5 dark:text-gray-200"
              }`}
          >
            {icon}
          </span>
          {!iconOnly && <span>{label}</span>}
        </span>
        {!iconOnly && (
          <FaChevronDown
            size={11}
            className={`text-gray-400 transition-transform duration-200 group-hover:text-[#fb8c00] ${open ? "rotate-180" : ""
              }`}
          />
        )}
      </button>

      {/* Inline accordion (expanded sidebar) */}
      {open && !iconOnly && (
        <ul className="flex flex-col gap-0.5 ml-[18px] mt-1 pl-4 border-l border-[#E4E6EF] dark:border-white/10">
          {items}
        </ul>
      )}

      {/* Hover flyout (icon-only sidebar) — keeps submenu functionality when collapsed */}
      {iconOnly && (
        <div
          className="invisible opacity-0 group-hover/nav:visible group-hover/nav:opacity-100 absolute left-full top-0 ml-2 min-w-[200px] rounded-xl bg-[#F5F6FA] dark:bg-[#1c1f3a] border border-[#E4E6EF] dark:border-white/10 shadow-lg py-2 px-2 transition-all duration-150 z-[1100]"
        >
          <div className="px-2 pb-1.5 mb-1 text-[12px] font-semibold text-gray-400 dark:text-gray-500 border-b border-[#E4E6EF] dark:border-white/10 flex items-center gap-1">
            {label}
            <FaChevronRight size={8} />
          </div>
          <ul className="flex flex-col gap-0.5">{items}</ul>
        </div>
      )}
    </li>
  );

  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {mobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-[1040] lg:hidden"
          onClick={() => setCollapsed && setCollapsed(true)}
        />
      )}

      <div
        className="flex flex-col bg-[#F5F6FA] dark:bg-[#14162c] border-r border-[#E4E6EF] dark:border-white/10 overflow-visible"
        style={{
          width: mobile ? (collapsed ? "0px" : "268px") : collapsed ? "84px" : "268px",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          transition: "width .25s ease, background-color .2s ease",
          zIndex: 1050,
          boxShadow: "1px 0 0 rgba(0,0,0,0.03), 4px 0 24px rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div
            className={`flex items-center shrink-0 ${iconOnly ? "justify-center" : "px-5"
              } h-[76px] border-b border-[#E4E6EF] dark:border-white/10`}
          >
            {iconOnly ? (
              <img
                src={company?.logo || "/logo.png"}
                alt="logo"
                width={38}
                height={38}
                className="rounded-full object-cover"
              />
            ) : (
              <img src={company?.logo || "/logo.png"} alt="logo" className="max-h-10 w-auto object-contain" />
            )}
          </div>

          {/* Nav */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-visible px-3 py-4 sidebar-scroll">
            <ul className="flex flex-col gap-1">
              <PermissionGate permission="dashboard.view">
                <li>
                  <NavLink
                    href="/dashboard"
                    icon={<FaTachometerAlt />}
                    label="Dashboard"
                    active={pathname === "/dashboard"}
                  />
                </li>
              </PermissionGate>

              <PermissionGate permission="users.view">
                <Group
                  icon={<FaUsers />}
                  label="Users"
                  open={crmOpen}
                  onClick={() => setCrmOpen(!crmOpen)}
                  active={
                    pathname.startsWith("/dashboard/users") ||
                    pathname.startsWith("/dashboard/permissions") ||
                    pathname.startsWith("/dashboard/roles")
                  }
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/users"
                          icon={<FaUsers />}
                          label="User Management"
                          active={pathname.startsWith("/dashboard/users")}
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/permissions"
                          icon={<FaUserShield />}
                          label="Permission"
                          active={pathname.startsWith("/dashboard/permissions")}
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/roles"
                          icon={<FaUserTag />}
                          label="Roles"
                          active={pathname.startsWith("/dashboard/roles")}
                        />
                      </li>
                    </>
                  }
                />
              </PermissionGate>

              <PermissionGate permission="inventory.view">
                <Group
                  icon={<FaBoxOpen />}
                  label="Inventory"
                  open={inventoryOpen}
                  onClick={() => setInventoryOpen(!inventoryOpen)}
                  active={pathname.startsWith("/dashboard/inventory")}
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/inventory/dashboard"
                          icon={<FaTachometerAlt />}
                          label="Inventory Dashboard"
                          active={pathname === "/dashboard/inventory/dashboard"}
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/inventory/products"
                          icon={<FaBoxOpen />}
                          label="Products"
                          active={pathname.startsWith("/dashboard/inventory/products")}
                        />
                      </li>
                      <li>
                        <SubLink href="#" icon={<FaWarehouse />} label="Stock" active={false} />
                      </li>
                    </>
                  }
                />
              </PermissionGate>

              <PermissionGate permission="sales.view">
                <Group
                  icon={<FaShoppingCart />}
                  label="Sales"
                  open={salesOpen}
                  onClick={() => setSalesOpen(!salesOpen)}
                  active={pathname.startsWith("/dashboard/sales")}
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/sales/dashboard/"
                          icon={<FaTachometerAlt />}
                          label="Sales Dashboard"
                          active={pathname.startsWith("/dashboard/sales/dashboard/")}
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/sales/invoice"
                          icon={<FaFileInvoice />}
                          label="Invoices"
                          active={pathname.startsWith("/dashboard/sales/invoice")}
                        />
                      </li>
                      <li>
                        <SubLink href="#" icon={<FaClipboardList />} label="Orders" active={false} />
                      </li>
                    </>
                  }
                />
              </PermissionGate>

              <PermissionGate permission="customer.view">
                <Group
                  icon={<FaBuilding />}
                  label="Customer"
                  open={customerOpen}
                  onClick={() => setCustomerOpen(!customerOpen)}
                  active={pathname.startsWith("/dashboard/customers")}
                  items={
                    <li>
                      <SubLink
                        href="/dashboard/customers"
                        icon={<FaListUl />}
                        label="List Customers"
                        active={pathname.startsWith("/dashboard/customers")}
                      />
                    </li>
                  }
                />
              </PermissionGate>

              <PermissionGate permission="company.view">
                <Group
                  icon={<FaBuilding />}
                  label="Company"
                  open={companyOpen}
                  onClick={() => setCompanyOpen(!companyOpen)}
                  active={pathname.startsWith("/dashboard/company")}
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/company/create"
                          icon={<FaPlusCircle />}
                          label="Create Company"
                          active={pathname.startsWith("/dashboard/company/create")}
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/company/list"
                          icon={<FaListUl />}
                          label="List Company"
                          active={pathname.startsWith("/dashboard/company/list")}
                        />
                      </li>
                    </>
                  }
                />
              </PermissionGate>

              <PermissionGate permission="financialyear.view">
                <Group
                  icon={<FaCalendarAlt />}
                  label="Financial Year"
                  open={fyOpen}
                  onClick={() => setFyOpen(!fyOpen)}
                  active={pathname.startsWith("/dashboard/financial-year")}
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/financial-year/create"
                          icon={<FaPlusCircle />}
                          label="Create FY"
                          active={pathname.startsWith("/dashboard/financial-year/create")}
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/financial-year/list"
                          icon={<FaListUl />}
                          label="List FY"
                          active={pathname.startsWith("/dashboard/financial-year/list")}
                        />
                      </li>
                    </>
                  }
                />
              </PermissionGate>

              {(can("vfp.view") || can("vfp.settings")) && (
                <Group
                  icon={<FaExchangeAlt />}
                  label="VFP Integration"
                  open={vfpOpen}
                  onClick={() => setVfpOpen(!vfpOpen)}
                  active={pathname.startsWith("/dashboard/vfp")}
                  items={
                    <>
                      {can("vfp.view") && (
                        <li>
                          <SubLink
                            href="/dashboard/vfp"
                            icon={<FaSyncAlt />}
                            label="Sync Console"
                            active={pathname === "/dashboard/vfp"}
                          />
                        </li>
                      )}
                      {can("vfp.settings") && (
                        <li>
                          <SubLink
                            href="/dashboard/vfp/settings"
                            icon={<FaSlidersH />}
                            label="VFP Settings"
                            active={pathname.startsWith("/dashboard/vfp/settings")}
                          />
                        </li>
                      )}
                    </>
                  }
                />
              )}

              <PermissionGate permission="reports.view">
                <li>
                  <NavLink
                    href="/dashboard/reports"
                    icon={<FaChartBar />}
                    label="Reports"
                    active={pathname.startsWith("/dashboard/reports")}
                  />
                </li>
              </PermissionGate>

              <PermissionGate permission="settings.edit">
                <li>
                  <NavLink
                    href="/dashboard/settings"
                    icon={<FaCog />}
                    label="Company Settings"
                    active={pathname.startsWith("/dashboard/settings")}
                  />
                </li>
              </PermissionGate>
            </ul>
          </div>

          {/* Profile footer */}
          <div
            className={`border-t border-[#E4E6EF] dark:border-white/10 p-3 shrink-0 ${iconOnly ? "flex justify-center" : ""
              }`}
          >
            <div
              className={`flex items-center gap-3 rounded-xl px-2 py-2 ${iconOnly ? "" : "bg-[#343872]/5 dark:bg-white/5"
                }`}
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#343872] text-white flex-shrink-0">
                <FaUserCircle size={18} />
              </span>
              {!iconOnly && (
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#343872] dark:text-white truncate">
                    Company Admin
                  </div>
                  <div className="text-[11px] text-gray-400">Logged in</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(52, 56, 114, 0.15);
          border-radius: 999px;
        }
        .dark .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </>
  );
}