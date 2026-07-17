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

// ---------------------------------------------------------------------------
// Color system
// Every nav section gets its own color. All Tailwind class strings below are
// written out FULLY and STATICALLY (no `${color}-500` string building) so
// Tailwind's JIT scanner always finds them and never purges them in a
// production build. This also avoids "unknown word" editor/spell-check
// squiggles that show up under dynamically-built class name fragments.
// ---------------------------------------------------------------------------
type ColorKey =
  | "indigo"
  | "violet"
  | "sky"
  | "blue"
  | "emerald"
  | "amber"
  | "teal"
  | "rose"
  | "orange"
  | "cyan";

type ColorClasses = {
  bar: string; // active-state left indicator bar
  iconText: string; // icon color, inactive state
  iconActiveBg: string; // icon background, active state
  hoverText: string; // label/text color on hover
  activeText: string; // label/text color when active
  subHoverIcon: string; // sub-link icon color on hover
  glow: string; // raw hex used for the glass glow blob
  glowDark: string; // darker hex stop for the active icon's glossy gradient
};

const colorMap: Record<ColorKey, ColorClasses> = {
  indigo: {
    bar: "bg-indigo-600",
    iconText: "text-indigo-600 dark:text-indigo-400",
    iconActiveBg: "bg-indigo-600",
    hoverText: "hover:text-indigo-600 dark:hover:text-indigo-400",
    activeText: "text-indigo-600 dark:text-indigo-400",
    subHoverIcon: "group-hover/sub:text-indigo-600 dark:group-hover/sub:text-indigo-400",
    glow: "#4f46e5",
    glowDark: "#4338ca",
  },
  violet: {
    bar: "bg-violet-600",
    iconText: "text-violet-600 dark:text-violet-400",
    iconActiveBg: "bg-violet-600",
    hoverText: "hover:text-violet-600 dark:hover:text-violet-400",
    activeText: "text-violet-600 dark:text-violet-400",
    subHoverIcon: "group-hover/sub:text-violet-600 dark:group-hover/sub:text-violet-400",
    glow: "#7c3aed",
    glowDark: "#6d28d9",
  },
  sky: {
    bar: "bg-sky-600",
    iconText: "text-sky-600 dark:text-sky-400",
    iconActiveBg: "bg-sky-600",
    hoverText: "hover:text-sky-600 dark:hover:text-sky-400",
    activeText: "text-sky-600 dark:text-sky-400",
    subHoverIcon: "group-hover/sub:text-sky-600 dark:group-hover/sub:text-sky-400",
    glow: "#0284c7",
    glowDark: "#0369a1",
  },
  blue: {
    bar: "bg-blue-600",
    iconText: "text-blue-600 dark:text-blue-400",
    iconActiveBg: "bg-blue-600",
    hoverText: "hover:text-blue-600 dark:hover:text-blue-400",
    activeText: "text-blue-600 dark:text-blue-400",
    subHoverIcon: "group-hover/sub:text-blue-600 dark:group-hover/sub:text-blue-400",
    glow: "#2563eb",
    glowDark: "#1d4ed8",
  },
  emerald: {
    bar: "bg-emerald-600",
    iconText: "text-emerald-600 dark:text-emerald-400",
    iconActiveBg: "bg-emerald-600",
    hoverText: "hover:text-emerald-600 dark:hover:text-emerald-400",
    activeText: "text-emerald-600 dark:text-emerald-400",
    subHoverIcon: "group-hover/sub:text-emerald-600 dark:group-hover/sub:text-emerald-400",
    glow: "#059669",
    glowDark: "#047857",
  },
  amber: {
    bar: "bg-amber-600",
    iconText: "text-amber-600 dark:text-amber-400",
    iconActiveBg: "bg-amber-600",
    hoverText: "hover:text-amber-600 dark:hover:text-amber-400",
    activeText: "text-amber-600 dark:text-amber-400",
    subHoverIcon: "group-hover/sub:text-amber-600 dark:group-hover/sub:text-amber-400",
    glow: "#d97706",
    glowDark: "#b45309",
  },
  teal: {
    bar: "bg-teal-600",
    iconText: "text-teal-600 dark:text-teal-400",
    iconActiveBg: "bg-teal-600",
    hoverText: "hover:text-teal-600 dark:hover:text-teal-400",
    activeText: "text-teal-600 dark:text-teal-400",
    subHoverIcon: "group-hover/sub:text-teal-600 dark:group-hover/sub:text-teal-400",
    glow: "#0d9488",
    glowDark: "#0f766e",
  },
  rose: {
    bar: "bg-rose-600",
    iconText: "text-rose-600 dark:text-rose-400",
    iconActiveBg: "bg-rose-600",
    hoverText: "hover:text-rose-600 dark:hover:text-rose-400",
    activeText: "text-rose-600 dark:text-rose-400",
    subHoverIcon: "group-hover/sub:text-rose-600 dark:group-hover/sub:text-rose-400",
    glow: "#e11d48",
    glowDark: "#be123c",
  },
  orange: {
    bar: "bg-orange-600",
    iconText: "text-orange-600 dark:text-orange-400",
    iconActiveBg: "bg-orange-600",
    hoverText: "hover:text-orange-600 dark:hover:text-orange-400",
    activeText: "text-orange-600 dark:text-orange-400",
    subHoverIcon: "group-hover/sub:text-orange-600 dark:group-hover/sub:text-orange-400",
    glow: "#ea580c",
    glowDark: "#c2410c",
  },
  cyan: {
    bar: "bg-cyan-600",
    iconText: "text-cyan-600 dark:text-cyan-400",
    iconActiveBg: "bg-cyan-600",
    hoverText: "hover:text-cyan-600 dark:hover:text-cyan-400",
    activeText: "text-cyan-600 dark:text-cyan-400",
    subHoverIcon: "group-hover/sub:text-cyan-600 dark:group-hover/sub:text-cyan-400",
    glow: "#0891b2",
    glowDark: "#0e7490",
  },
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

  const [user, setUser] = useState<any>(null);

  const [company, setCompany] = useState<any>(null);
  useEffect(() => {
    //fetch("/api/company-master")
    fetch("/api/company-settings")
      .then((res) => res.json())
      .then((data) => setCompany(data))
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);

        setUser(data.user);   // <-- sirf user object save karo
      })
      .catch(console.error);
  }, []);

  // Sidebar is "iconOnly" when collapsed on desktop. On mobile, collapsed just hides it entirely.
  const iconOnly = collapsed && !mobile;

  // ---------------- Single link (no submenu) ----------------
  const NavLink = ({
    href,
    icon,
    label,
    active,
    color,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    color: ColorKey;
  }) => {
    const c = colorMap[color];
    return (
      <Link
        href={href}
        title={iconOnly ? label : ""}
        className={`glass-nav-item relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] transition-all duration-300 ease-out group ${iconOnly ? "justify-center px-0" : ""
          } ${active
            ? `glass-nav-item-active font-semibold ${c.activeText}`
            : `text-gray-600 dark:text-gray-400 hover:text-gray-800 ${c.hoverText}`
          }`}
      >
        {active && (
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${c.bar} transition-all duration-300`}
          />
        )}
        <span
          className={`relative flex items-center justify-center w-8 h-8 shrink-0 rounded-xl text-[14px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${active
            ? "icon-chip-active text-white scale-105"
            : `glass-icon-chip ${c.iconText} group-hover:scale-110 group-hover:-rotate-3`
            }`}
          style={
            active
              ? {
                background: `linear-gradient(155deg, ${c.glow} 0%, ${c.glowDark} 100%)`,
                boxShadow: `0 4px 14px -2px ${c.glow}80, inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -3px 4px rgba(0,0,0,0.18)`,
              }
              : undefined
          }
        >
          {active && (
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/50 to-transparent" />
          )}
          <span className="relative">{icon}</span>
        </span>
        {!iconOnly && <span className="truncate transition-opacity duration-200">{label}</span>}
      </Link>
    );
  };

  // ---------------- Sub-link inside an expanded group ----------------
  const SubLink = ({
    href,
    icon,
    label,
    active,
    color,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    color: ColorKey;
  }) => {
    const c = colorMap[color];
    return (
      <Link
        href={href}
        className={`group/sub flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200 ease-out ${active
          ? `bg-white/50 dark:bg-white/5 font-medium ${c.activeText}`
          : `text-gray-500 dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/5 ${c.hoverText}`
          }`}
      >
        <span
          className={`text-[12px] transition-colors duration-200 ${active ? c.activeText : `text-gray-400 ${c.subHoverIcon}`
            }`}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  // ---------------- Collapsible group ----------------

  const Group = ({
    icon,
    label,
    open,
    onClick,
    active,
    items,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    open: boolean;
    onClick: () => void;
    active: boolean;
    items: React.ReactNode;
    color: ColorKey;
  }) => {
    const c = colorMap[color];
    return (
      <li className={`group/nav relative ${iconOnly ? "flex justify-center" : ""}`}>
        <button
          title={iconOnly ? label : ""}
          onClick={onClick}
          className={`glass-nav-item w-full flex items-center justify-between rounded-2xl text-[13.5px] transition-all duration-300 ease-out group ${iconOnly ? "justify-center px-0 py-2.5 w-11" : "px-3 py-2.5"
            } ${active
              ? `glass-nav-item-active font-semibold ${c.activeText}`
              : `text-gray-600 dark:text-gray-400 hover:text-gray-800 ${c.hoverText}`
            }`}
        >
          <span className="flex items-center gap-3">
            <span
              className={`relative flex items-center justify-center w-8 h-8 shrink-0 rounded-xl text-[14px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${active
                ? "icon-chip-active text-white scale-105"
                : `glass-icon-chip ${c.iconText} group-hover:scale-110 group-hover:-rotate-3`
                }`}
              style={
                active
                  ? {
                    background: `linear-gradient(155deg, ${c.glow} 0%, ${c.glowDark} 100%)`,
                    boxShadow: `0 4px 14px -2px ${c.glow}80, inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -3px 4px rgba(0,0,0,0.18)`,
                  }
                  : undefined
              }
            >
              {active && (
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/50 to-transparent" />
              )}
              <span className="relative">{icon}</span>
            </span>
            {!iconOnly && <span>{label}</span>}
          </span>
          {!iconOnly && (
            <FaChevronDown
              size={11}
              className={`text-gray-400 transition-transform duration-300 ease-out ${c.hoverText} ${open ? "rotate-180" : ""
                }`}
            />
          )}
        </button>

        {/* Inline accordion (expanded sidebar) — smooth height/opacity reveal */}
        <ul
          className={`flex flex-col gap-0.5 ml-[18px] pl-4 border-l border-white/50 dark:border-white/10 overflow-hidden transition-all duration-300 ease-out ${open && !iconOnly ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0"
            }`}
        >
          {items}
        </ul>

        {/* Hover flyout (icon-only sidebar) — keeps submenu functionality when collapsed */}
        {iconOnly && (
          <div className="glass-flyout invisible opacity-0 translate-x-1 scale-95 group-hover/nav:visible group-hover/nav:opacity-100 group-hover/nav:translate-x-0 group-hover/nav:scale-100 absolute left-full top-0 ml-2 min-w-[200px] rounded-2xl py-2 px-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-[1100]">
            <div
              className={`px-2 pb-1.5 mb-1 text-[12px] font-semibold border-b border-white/50 dark:border-white/10 flex items-center gap-1 ${c.activeText}`}
            >
              {label}
              <FaChevronRight size={8} />
            </div>
            <ul className="flex flex-col gap-0.5">{items}</ul>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {mobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1040] lg:hidden transition-opacity duration-300"
          onClick={() => setCollapsed && setCollapsed(true)}
        />
      )}

      <div
        className="glass-sidebar flex flex-col overflow-visible"
        style={{
          width: mobile ? (collapsed ? "0px" : "268px") : collapsed ? "84px" : "268px",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          transition: "width .3s cubic-bezier(0.4, 0, 0.2, 1), background-color .2s ease",
          zIndex: 1050,
        }}
      >
        {/* specular highlight sweeping down the glass panel */}
        <div className="pointer-events-none absolute inset-0 glass-sidebar-specular" />

        <div className="relative flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div
            className={`flex items-center shrink-0 ${iconOnly ? "justify-center" : "px-5"
              } h-[76px] border-b border-white/40 dark:border-white/10`}
          >
            {iconOnly ? (
              <img
                src={company?.logo || "/m-logo.jpg"}
                alt="logo"
                width={38}
                height={38}
                className="rounded-full object-cover transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
              />
            ) : (
              <img
                src={company?.logo || "/m-logo.jpg"}
                alt="logo"
                className="max-h-20 w-auto object-contain"
              />

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
                    color="indigo"
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
                  color="violet"
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/users"
                          icon={<FaUsers />}
                          label="User Management"
                          active={pathname.startsWith("/dashboard/users")}
                          color="violet"
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/permissions"
                          icon={<FaUserShield />}
                          label="Permission"
                          active={pathname.startsWith("/dashboard/permissions")}
                          color="violet"
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/roles"
                          icon={<FaUserTag />}
                          label="Roles"
                          active={pathname.startsWith("/dashboard/roles")}
                          color="violet"
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
                  color="sky"
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/inventory/dashboard"
                          icon={<FaTachometerAlt />}
                          label="Inventory Dashboard"
                          active={pathname === "/dashboard/inventory/dashboard"}
                          color="sky"
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/inventory/products"
                          icon={<FaBoxOpen />}
                          label="Products"
                          active={pathname.startsWith("/dashboard/inventory/products")}
                          color="sky"
                        />
                      </li>
                      <li>
                        <SubLink href="#" icon={<FaWarehouse />} label="Stock" active={false} color="sky" />
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
                  color="blue"
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/sales/dashboard/"
                          icon={<FaTachometerAlt />}
                          label="Sales Dashboard"
                          active={pathname.startsWith("/dashboard/sales/dashboard/")}
                          color="blue"
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/sales/invoice"
                          icon={<FaFileInvoice />}
                          label="Invoices"
                          active={pathname.startsWith("/dashboard/sales/invoice")}
                          color="blue"
                        />
                      </li>
                      <li>
                        <SubLink href="/dashboard/orders" icon={<FaClipboardList />} label="Orders" active={false} color="blue" />
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
                  color="emerald"
                  items={
                    <li>
                      <SubLink
                        href="/dashboard/customers"
                        icon={<FaListUl />}
                        label="List Customers"
                        active={pathname.startsWith("/dashboard/customers")}
                        color="emerald"
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
                  color="amber"
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/company/create"
                          icon={<FaPlusCircle />}
                          label="Create Company"
                          active={pathname.startsWith("/dashboard/company/create")}
                          color="amber"
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/company/list"
                          icon={<FaListUl />}
                          label="List Company"
                          active={pathname.startsWith("/dashboard/company/list")}
                          color="amber"
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
                  color="teal"
                  items={
                    <>
                      <li>
                        <SubLink
                          href="/dashboard/financial-year/create"
                          icon={<FaPlusCircle />}
                          label="Create FY"
                          active={pathname.startsWith("/dashboard/financial-year/create")}
                          color="teal"
                        />
                      </li>
                      <li>
                        <SubLink
                          href="/dashboard/financial-year/list"
                          icon={<FaListUl />}
                          label="List FY"
                          active={pathname.startsWith("/dashboard/financial-year/list")}
                          color="teal"
                        />
                      </li>
                    </>
                  }
                />
              </PermissionGate>

              {(can("vfp.view") || can("vfp.settings")) && (
                <Group
                  icon={<FaExchangeAlt />}
                  label="Data Migration"
                  open={vfpOpen}
                  onClick={() => setVfpOpen(!vfpOpen)}
                  active={pathname.startsWith("/dashboard/vfp")}
                  color="rose"
                  items={
                    <>
                      {can("vfp.view") && (
                        <li>
                          <SubLink
                            href="/dashboard/vfp"
                            icon={<FaSyncAlt />}
                            label="Sync Console"
                            active={pathname === "/dashboard/vfp"}
                            color="rose"
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
                            color="rose"
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
                    color="orange"
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
                    color="cyan"
                  />
                </li>
              </PermissionGate>
            </ul>
          </div>

          {/* Profile footer */}
          <div
            className={`border-t border-white/40 dark:border-white/10 p-3 shrink-0 transition-all duration-300 ${iconOnly ? "flex justify-center" : ""
              }`}
          >
            <div
              className={`glass-profile-chip flex items-center gap-3 rounded-2xl px-2 py-2 transition-all duration-300 ${iconOnly ? "!bg-transparent !shadow-none !border-transparent px-0" : ""
                }`}
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#343872] text-white flex-shrink-0 shadow-[0_4px_12px_-2px_rgba(52,56,114,0.4)]">
                <FaUserCircle size={18} />
              </span>
              {!iconOnly && (
                <div className="min-w-0">


                  <div className="text-[13px] font-semibold text-[#343872] dark:text-white truncate">
                    {user?.name || "User"}
                  </div>

                  <div className="text-[11px] text-gray-500 truncate">
                    {user?.roleId?.roleName || "Logged in"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .glass-sidebar {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.28) 40%, rgba(255,255,255,0.38) 100%);
          backdrop-filter: blur(28px) saturate(180%) brightness(1.04);
          -webkit-backdrop-filter: blur(28px) saturate(180%) brightness(1.04);
          border-right: 1px solid rgba(255,255,255,0.5);
          box-shadow:
            inset -1px 0 0 rgba(255,255,255,0.5),
            inset 1px 0 1px rgba(255,255,255,0.8),
            4px 0 32px rgba(31,38,135,0.08),
            1px 0 0 rgba(31,38,135,0.04);
        }
        .dark .glass-sidebar {
          background:
            linear-gradient(180deg, rgba(20,22,44,0.7) 0%, rgba(20,22,44,0.5) 100%);
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .glass-sidebar-specular {
          background: radial-gradient(140% 60% at 15% 0%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.15) 35%, transparent 65%);
          mix-blend-mode: screen;
        }
        .dark .glass-sidebar-specular {
          background: radial-gradient(140% 60% at 15% 0%, rgba(255,255,255,0.12) 0%, transparent 55%);
        }

        .glass-nav-item:hover {
          background: rgba(255,255,255,0.45);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(31,38,135,0.06);
        }
        .dark .glass-nav-item:hover {
          background: rgba(255,255,255,0.06);
        }
        .glass-nav-item-active {
          background: rgba(255,255,255,0.6);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,0.9),
            inset 0 -1px 2px rgba(0,0,0,0.03),
            0 4px 14px rgba(31,38,135,0.1);
        }
        .dark .glass-nav-item-active {
          background: rgba(255,255,255,0.08);
        }

        .glass-icon-chip {
          background: rgba(255,255,255,0.5);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.04);
          border: 1px solid rgba(255,255,255,0.6);
        }
        .dark .glass-icon-chip {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.08);
        }

        .glass-flyout {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,0.9),
            0 16px 40px -8px rgba(31,38,135,0.2);
        }
        .dark .glass-flyout {
          background: rgba(28,31,58,0.9);
          border-color: rgba(255,255,255,0.1);
        }

        .glass-profile-chip {
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(31,38,135,0.06);
        }
        .dark .glass-profile-chip {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.08);
        }

        .sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(52, 56, 114, 0.18);
          border-radius: 999px;
          transition: background-color 0.2s ease;
        }
        .dark .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </>
  );
}