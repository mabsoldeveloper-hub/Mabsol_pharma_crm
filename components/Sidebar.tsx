"use client";
import { usePermission } from "@/context/PermissionContext";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    DEFAULT_MENU_ITEMS,
    MenuItemConfig,
    SubMenuItemConfig,
    ColorKey,
    renderMenuIcon,
  } from "@/lib/defaultMenuData";
import {
  FaChevronDown,
  FaChevronRight,
  FaUserCircle,
  FaPalette,
  FaCheck,
  FaUndoAlt,
} from "react-icons/fa";

export type SidebarThemeId =
  | "default"
  // Blue Shaders for Sidebar
  | "deep_navy"
  | "royal_blue"
  | "cobalt_navy"
  | "cyber_electric"
  | "ice_azure"
  | "ocean_sapphire"
  | "steel_blue"
  // Other Palettes
  | "midnight_dark"
  | "emerald_mint"
  | "royal_purple"
  | "sunset_rose"
  | "amber_warm"
  | "custom";

export interface SidebarPresetTheme {
  id: SidebarThemeId;
  name: string;
  category: "blue" | "other";
  color: string;
  bgGradient: string;
  borderColor: string;
  isDark: boolean;
}

export const SIDEBAR_PRESET_THEMES: SidebarPresetTheme[] = [
  {
    id: "default",
    name: "Classic Glass",
    category: "other",
    color: "#6366f1",
    bgGradient: "linear-gradient(160deg, rgba(248,249,255,0.98) 0%, rgba(241,244,255,0.95) 50%, rgba(247,249,255,0.97) 100%)",
    borderColor: "rgba(99,102,241,0.15)",
    isDark: false,
  },
  // ===== BLUE SHADERS FOR SIDEBAR =====
  {
    id: "deep_navy",
    name: "Deep Navy",
    category: "blue",
    color: "#001f54",
    bgGradient: "linear-gradient(180deg, #0a1128 0%, #001f54 50%, #034078 100%)",
    borderColor: "rgba(56,189,248,0.25)",
    isDark: true,
  },
  {
    id: "royal_blue",
    name: "Royal Navy",
    category: "blue",
    color: "#1e40af",
    bgGradient: "linear-gradient(180deg, #172554 0%, #1e3a8a 50%, #1e40af 100%)",
    borderColor: "rgba(96,165,250,0.3)",
    isDark: true,
  },
  {
    id: "cobalt_navy",
    name: "Cobalt Tech",
    category: "blue",
    color: "#312e81",
    bgGradient: "linear-gradient(180deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)",
    borderColor: "rgba(129,140,248,0.3)",
    isDark: true,
  },
  {
    id: "cyber_electric",
    name: "Cyber Neon",
    category: "blue",
    color: "#0b0f19",
    bgGradient: "linear-gradient(180deg, #0b0f19 0%, #111827 50%, #0f172a 100%)",
    borderColor: "rgba(14,165,233,0.35)",
    isDark: true,
  },
  {
    id: "ice_azure",
    name: "Ice Azure",
    category: "blue",
    color: "#0284c7",
    bgGradient: "linear-gradient(165deg, #ffffff 0%, #f0f9ff 50%, #e0f2fe 100%)",
    borderColor: "rgba(14,165,233,0.25)",
    isDark: false,
  },
  {
    id: "ocean_sapphire",
    name: "Sapphire Sky",
    category: "blue",
    color: "#0ea5e9",
    bgGradient: "linear-gradient(165deg, #ffffff 0%, #eff6ff 50%, #dbeafe 100%)",
    borderColor: "rgba(59,130,246,0.25)",
    isDark: false,
  },
  {
    id: "steel_blue",
    name: "Steel Slate",
    category: "blue",
    color: "#64748b",
    bgGradient: "linear-gradient(165deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)",
    borderColor: "rgba(100,116,139,0.25)",
    isDark: false,
  },
  // ===== OTHER PALETTES =====
  {
    id: "midnight_dark",
    name: "Midnight Dark",
    category: "other",
    color: "#1e293b",
    bgGradient: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    borderColor: "rgba(255,255,255,0.12)",
    isDark: true,
  },
  {
    id: "emerald_mint",
    name: "Emerald Mint",
    category: "other",
    color: "#10b981",
    bgGradient: "linear-gradient(165deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)",
    borderColor: "rgba(16,185,129,0.25)",
    isDark: false,
  },
  {
    id: "royal_purple",
    name: "Royal Purple",
    category: "other",
    color: "#8b5cf6",
    bgGradient: "linear-gradient(165deg, #ffffff 0%, #faf5ff 50%, #f3e8ff 100%)",
    borderColor: "rgba(168,85,247,0.25)",
    isDark: false,
  },
  {
    id: "sunset_rose",
    name: "Sunset Rose",
    category: "other",
    color: "#f43f5e",
    bgGradient: "linear-gradient(165deg, #ffffff 0%, #fff1f2 50%, #ffe4e6 100%)",
    borderColor: "rgba(244,63,94,0.25)",
    isDark: false,
  },
  {
    id: "amber_warm",
    name: "Warm Amber",
    category: "other",
    color: "#f59e0b",
    bgGradient: "linear-gradient(165deg, #ffffff 0%, #fffbf6 50%, #fff5eb 100%)",
    borderColor: "rgba(245,158,11,0.25)",
    isDark: false,
  },
];

// Helper to convert hex to rgba
function hexToRgba(hex: string, alpha: number) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(59, 130, 246, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to check if a hex color is dark
function isColorDark(hex: string) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 130;
}

type SidebarProps = {
  collapsed: boolean;
  setCollapsed?: (value: boolean) => void;
  mobile: boolean;
};

type ColorClasses = {
  bar: string;
  iconText: string;
  iconActiveBg: string;
  hoverText: string;
  activeText: string;
  subHoverIcon: string;
  glow: string;
  glowDark: string;
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
  const { can, loading: permissionsLoading } = usePermission();
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const pathname = usePathname();

  const [menuItems, setMenuItems] = useState<MenuItemConfig[]>(DEFAULT_MENU_ITEMS);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Sidebar Theme Customization State
  const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeId>("default");
  const [sidebarCustomHex, setSidebarCustomHex] = useState<string>("#001f54");
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("sidebar_theme");
      if (savedTheme) {
        setSidebarTheme(savedTheme as SidebarThemeId);
      }
      const savedCustom = localStorage.getItem("sidebar_custom_hex");
      if (savedCustom) {
        setSidebarCustomHex(savedCustom);
      }
    }
  }, []);

  // Listen to external sidebar-theme-changed event (e.g. from Dashboard topbar)
  useEffect(() => {
    const handleThemeChanged = () => {
      if (typeof window !== "undefined") {
        const savedTheme = localStorage.getItem("sidebar_theme");
        if (savedTheme) setSidebarTheme(savedTheme as SidebarThemeId);
        const savedCustom = localStorage.getItem("sidebar_custom_hex");
        if (savedCustom) setSidebarCustomHex(savedCustom);
      }
    };
    window.addEventListener("sidebar-theme-changed", handleThemeChanged);
    return () => window.removeEventListener("sidebar-theme-changed", handleThemeChanged);
  }, []);

  // Click outside to close sidebar color picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColorPicker]);

  const handleSelectSidebarTheme = (themeId: SidebarThemeId) => {
    setSidebarTheme(themeId);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_theme", themeId);
      window.dispatchEvent(new Event("sidebar-theme-changed"));
    }
  };

  const handleSidebarCustomColorChange = (hex: string) => {
    setSidebarCustomHex(hex);
    setSidebarTheme("custom");
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_theme", "custom");
      localStorage.setItem("sidebar_custom_hex", hex);
      window.dispatchEvent(new Event("sidebar-theme-changed"));
    }
  };

  const currentVisuals = useMemo(() => {
    if (sidebarTheme === "custom") {
      const dark = isColorDark(sidebarCustomHex);
      return {
        bg: dark
          ? `linear-gradient(180deg, ${sidebarCustomHex} 0%, #0a0f1d 100%)`
          : `linear-gradient(165deg, #ffffff 0%, ${hexToRgba(sidebarCustomHex, 0.08)} 50%, ${hexToRgba(sidebarCustomHex, 0.2)} 100%)`,
        borderColor: hexToRgba(sidebarCustomHex, dark ? 0.35 : 0.25),
        isDark: dark,
        color: sidebarCustomHex,
      };
    }
    const matched = SIDEBAR_PRESET_THEMES.find((t) => t.id === sidebarTheme) || SIDEBAR_PRESET_THEMES[0];
    return {
      bg: matched.bgGradient,
      borderColor: matched.borderColor,
      isDark: matched.isDark,
      color: matched.color,
    };
  }, [sidebarTheme, sidebarCustomHex]);

  // Fetch Menu Adjustments based on active Company & FY
  const loadMenuAdjustments = useCallback(async () => {
    try {
      const companyId = selectedCompany?._id;
      const fyId = selectedFY?._id || "ALL";

      const url = companyId
        ? `/api/menu-adjustments?companyId=${companyId}&financialYearId=${fyId}`
        : `/api/menu-adjustments`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        // Sort items by order
        const sorted = [...data.items].sort((a: MenuItemConfig, b: MenuItemConfig) => (a.order ?? 0) - (b.order ?? 0));
        sorted.forEach((item: MenuItemConfig) => {
          if (item.subItems && Array.isArray(item.subItems)) {
            item.subItems.sort((a: SubMenuItemConfig, b: SubMenuItemConfig) => (a.order ?? 0) - (b.order ?? 0));
          }
        });
        setMenuItems(sorted);
      } else {
        setMenuItems(DEFAULT_MENU_ITEMS);
      }
    } catch (err) {
      console.error("Failed to load menu adjustments:", err);
      setMenuItems(DEFAULT_MENU_ITEMS);
    }
  }, [selectedCompany, selectedFY]);

  useEffect(() => {
    loadMenuAdjustments();

    const handleMenuChanged = () => {
      loadMenuAdjustments();
    };

    window.addEventListener("menu-settings-changed", handleMenuChanged);
    return () => {
      window.removeEventListener("menu-settings-changed", handleMenuChanged);
    };
  }, [loadMenuAdjustments]);

  // Automatically expand group containing the active pathname
  useEffect(() => {
    menuItems.forEach((group) => {
      if (group.isGroup && group.subItems) {
        const hasActiveChild = group.subItems.some((sub) => {
          if (!sub.href) return false;
          if (sub.href === "/dashboard") return pathname === "/dashboard";
          return pathname === sub.href || pathname.startsWith(sub.href + "/") || (sub.href.endsWith("/") && pathname.startsWith(sub.href));
        });
        if (hasActiveChild) {
          setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
        }
      }
    });
  }, [pathname, menuItems]);

  useEffect(() => {
    fetch("/api/company-settings")
      .then((res) => res.json())
      .then((data) => setCompanySettings(data))
      .catch(() => { });

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => { });
  }, []);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const iconOnly = collapsed && !mobile;

  // Filter items by visibility and user permissions
  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.isVisible === false) return false;

      // Permission check for main item
      if (item.permission && !can(item.permission)) {
        // If it's a group, check if any subitem is permitted
        if (item.isGroup && item.subItems && item.subItems.length > 0) {
          const hasAnyPermittedSub = item.subItems.some(
            (sub) => sub.isVisible !== false && (!sub.permission || can(sub.permission))
          );
          if (!hasAnyPermittedSub) return false;
        } else {
          return false;
        }
      }

      return true;
    });
  }, [menuItems, can]);

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
    const c = colorMap[color] || colorMap.indigo;

    const handleNavClick = () => {
      if (mobile && setCollapsed) {
        setCollapsed(true);
      }
    };

    if (iconOnly) {
      return (
        <Link
          href={href}
          title={label}
          onClick={handleNavClick}
          className={`relative flex items-center justify-center w-11 h-11 mx-auto rounded-2xl transition-all duration-300 ease-out group shrink-0 ${active
              ? "text-white scale-105 shadow-md"
              : `glass-icon-chip ${c.iconText} hover:scale-110 hover:-rotate-3`
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
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/50 to-transparent" />
          )}
          {active && (
            <span
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${c.bar}`}
            />
          )}
          <span className="text-[17px]">{icon}</span>
        </Link>
      );
    }

    return (
      <Link
        href={href}
        onClick={handleNavClick}
        className={`glass-nav-item relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] transition-all duration-300 ease-out group no-underline select-none ${active
            ? `glass-nav-item-active font-semibold ${c.activeText}`
            : `text-gray-700 dark:text-gray-200 hover:text-gray-900 ${c.hoverText}`
          }`}
      >
        {active && (
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${c.bar} transition-all duration-300`}
          />
        )}
        <span
          className={`relative flex items-center justify-center w-10 h-10 shrink-0 rounded-xl text-[15px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${active
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
        <span className="leading-tight whitespace-normal break-words transition-opacity duration-200">
          {label}
        </span>
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
    const c = colorMap[color] || colorMap.indigo;
    const handleSubClick = () => {
      if (mobile && setCollapsed) {
        setCollapsed(true);
      }
    };

    return (
      <Link
        href={href}
        title={label}
        onClick={handleSubClick}
        className={`group/sub flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12.5px] transition-all duration-200 ease-out no-underline select-none ${active
            ? `bg-white/60 dark:bg-white/10 font-semibold ${c.activeText} shadow-sm`
            : `text-gray-600 dark:text-gray-300 hover:bg-white/40 dark:hover:bg-white/5 ${c.hoverText}`
          }`}
      >
        <span
          className={`text-[12px] shrink-0 transition-colors duration-200 ${active ? c.activeText : `text-gray-400 ${c.subHoverIcon}`
            }`}
        >
          {icon}
        </span>
        <span className="leading-tight whitespace-normal break-words">{label}</span>
      </Link>
    );
  };

  // ---------------- Collapsible group ----------------
  const Group = ({
    id,
    icon,
    label,
    open,
    onClick,
    active,
    color,
    subItems,
  }: {
    id: string;
    icon: React.ReactNode;
    label: string;
    open: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    active: boolean;
    color: ColorKey;
    subItems: SubMenuItemConfig[];
  }) => {
    const c = colorMap[color] || colorMap.indigo;
    const [isHovered, setIsHovered] = useState(false);

    // Filter subitems by permissions & visibility
    const visibleSubs = subItems.filter((sub) => {
      if (sub.isVisible === false) return false;
      if (sub.permission && !can(sub.permission)) return false;
      return true;
    });

    if (visibleSubs.length === 0) return null;

    const renderedSubs = visibleSubs.map((sub) => {
      const isSubActive =
        sub.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === sub.href || pathname.startsWith(sub.href + "/");

      return (
        <li key={sub.id || sub.href}>
          <SubLink
            href={sub.href}
            icon={renderMenuIcon(sub.icon)}
            label={sub.label}
            active={isSubActive}
            color={color}
          />
        </li>
      );
    });

    return (
      <li
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative ${iconOnly ? "flex justify-center" : ""}`}
      >
        {iconOnly ? (
          <button
            type="button"
            title={label}
            onClick={(e) => {
              e.preventDefault();
              onClick(e);
            }}
            className={`relative flex items-center justify-center w-11 h-11 mx-auto rounded-2xl transition-all duration-300 ease-out shrink-0 select-none ${active
                ? "text-white scale-105 shadow-md"
                : `glass-icon-chip ${c.iconText} hover:scale-110 hover:-rotate-3`
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
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/50 to-transparent" />
            )}
            <span className="text-[17px]">{icon}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClick(e);
            }}
            className={`glass-nav-item w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-[13.5px] transition-all duration-300 ease-out group select-none ${active
                ? `glass-nav-item-active font-semibold ${c.activeText}`
                : `text-gray-700 dark:text-gray-200 hover:text-gray-900 ${c.hoverText}`
              }`}
          >
            <span className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <span
                className={`relative flex items-center justify-center w-10 h-10 shrink-0 rounded-xl text-[15px] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${active
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
              <span className="leading-tight whitespace-normal break-words text-left">
                {label}
              </span>
            </span>
            <FaChevronDown
              size={11}
              className={`text-gray-400 transition-transform duration-300 ease-out shrink-0 ml-1 ${c.hoverText
                } ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}

        {/* Inline accordion (expanded sidebar) using CSS grid-template-rows */}
        {!iconOnly && (
          <div className={`sidebar-submenu ${open ? "open" : ""}`}>
            <div className="sidebar-submenu-inner">
              <ul className="flex flex-col gap-0.5 ml-4 pl-1.5 border-l-2 border-slate-200/60 dark:border-white/10 my-1">
                {renderedSubs}
              </ul>
            </div>
          </div>
        )}

        {/* Hover flyout (collapsed icon-only sidebar) */}
        {iconOnly && isHovered && (
          <div
            className="glass-flyout absolute left-full top-0 ml-3 min-w-[220px] rounded-2xl p-3 shadow-2xl transition-all duration-200 ease-out z-[9999]"
            style={{
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              boxShadow:
                "0 20px 45px -10px rgba(31, 38, 135, 0.25), 0 0 0 1px rgba(0,0,0,0.06)",
            }}
          >
            <div
              className={`px-3 pb-2 mb-2 text-[12px] font-bold border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between ${c.activeText}`}
            >
              <span>{label}</span>
              <FaChevronRight size={9} />
            </div>
            <ul className="flex flex-col gap-1.5">{renderedSubs}</ul>
          </div>
        )}
      </li>
    );
  };

  const logoUrl =
    selectedCompany?.logo || companySettings?.logo || "/mabsol_logo.ico";

  return (
    <>
      {/* Mobile backdrop */}
      {mobile && !collapsed && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1040] lg:hidden transition-opacity duration-300"
          onClick={() => setCollapsed && setCollapsed(true)}
        />
      )}

      <div
        className={`glass-sidebar flex flex-col ${iconOnly ? "overflow-visible" : ""} ${currentVisuals.isDark ? "sidebar-dark-theme" : ""}`}
        style={{
          width: mobile ? "260px" : collapsed ? "76px" : "260px",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          background: currentVisuals.bg,
          borderRight: `1px solid ${currentVisuals.borderColor}`,
          transform: mobile && collapsed ? "translateX(-100%)" : "translateX(0)",
          transition:
            "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease",
          zIndex: 1050,
        }}
      >
        {/* Specular highlight sweeping down panel */}
        <div className="pointer-events-none absolute inset-0 glass-sidebar-specular" />

        <div className={`relative flex flex-col h-full ${iconOnly ? "overflow-visible" : ""}`}>
          {/* Logo */}
          <div
            className={`flex items-center justify-center shrink-0 ${iconOnly ? "px-0" : "px-5"
              } h-[76px] border-b ${currentVisuals.isDark ? "border-white/10" : "border-white/40 dark:border-white/10"}`}
          >
            {iconOnly ? (
              <img
                src={logoUrl}
                alt="logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/mabsol_logo.ico";
                }}
                className="w-11 h-11 rounded-full object-cover shadow-sm mx-auto transition-transform hover:scale-105"
              />
            ) : (
              <img
                src={logoUrl}
                alt="logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/mabsol_logo.ico";
                }}
                className="max-h-16 w-auto object-contain"
              />
            )}
          </div>

          {/* Nav List */}
          <div
            className={`flex-1 min-h-0 py-3 sidebar-scroll ${iconOnly ? "px-0 overflow-visible" : "px-2.5 overflow-y-auto"
              }`}
          >
            <ul className={`flex flex-col ${iconOnly ? "items-center gap-2" : "gap-1.5"}`}>
              {visibleMenuItems.map((item) => {
                const color = item.color || "indigo";

                if (item.isGroup && item.subItems && item.subItems.length > 0) {
                  const isGroupActive = item.subItems.some((sub) => {
                    if (!sub.href) return false;
                    if (sub.href === "/dashboard") return pathname === "/dashboard";
                    return (
                      pathname === sub.href ||
                      pathname.startsWith(sub.href + "/") ||
                      (sub.href.endsWith("/") && pathname.startsWith(sub.href))
                    );
                  });

                  return (
                    <Group
                      key={item.id}
                      id={item.id}
                      icon={renderMenuIcon(item.icon)}
                      label={item.label}
                      open={!!openGroups[item.id]}
                      onClick={() => toggleGroup(item.id)}
                      active={isGroupActive}
                      color={color}
                      subItems={item.subItems}
                    />
                  );
                }

                // Single link item
                const href = item.href || "#";
                const isSingleActive =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === href || pathname.startsWith(href + "/");

                return (
                  <li key={item.id}>
                    <NavLink
                      href={href}
                      icon={renderMenuIcon(item.icon)}
                      label={item.label}
                      active={isSingleActive}
                      color={color}
                    />
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Profile footer with Sidebar Color Theme Customizer */}
          <div className={`border-t ${currentVisuals.isDark ? "border-white/10" : "border-white/40 dark:border-white/10"} p-2.5 shrink-0 flex items-center justify-between gap-2 relative`}>
            {iconOnly ? (
              <div className="flex flex-col items-center gap-1.5 w-full">
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-[#343872] text-white flex-shrink-0 shadow-md mx-auto cursor-pointer"
                  title={user?.name || "User"}
                >
                  <FaUserCircle size={20} />
                </span>

                {/* Collapsed Palette Icon Button */}
                <div className="relative" ref={colorPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowColorPicker((prev) => !prev)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-200 cursor-pointer shadow-xs ${showColorPicker
                        ? "bg-slate-900 text-white border-slate-700 ring-2 ring-sky-500/40 scale-105"
                        : currentVisuals.isDark
                          ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                          : "bg-white/90 hover:bg-white border-slate-200/80 text-slate-700"
                      }`}
                    title="Customize Sidebar Theme & Colors"
                  >
                    <FaPalette size={10.5} className={showColorPicker ? "text-amber-400" : currentVisuals.isDark ? "text-sky-300" : "text-indigo-600"} />
                  </button>

                  {showColorPicker && (
                    <div className="fixed left-[82px] bottom-3 w-80 sm:w-96 max-h-[82vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-3.5 sm:p-4 z-[1090] animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
                      {/* Popover Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                            <FaPalette size={12} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white leading-none">Sidebar Color Theme</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Customize navigation bar background</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectSidebarTheme("default")}
                          className="text-[10.5px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                        >
                          <FaUndoAlt size={9} /> Reset
                        </button>
                      </div>

                      {/* Blue Shaders */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                          🌊 Blue Shades Collection
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          7 Shades
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mb-3.5">
                        {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "blue").map((theme) => {
                          const isSelected = sidebarTheme === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleSelectSidebarTheme(theme.id)}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${isSelected
                                  ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/50 shadow-xs ring-2 ring-sky-500/40 scale-102"
                                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-sky-50/50 hover:border-sky-300"
                                }`}
                              title={theme.name}
                            >
                              <div
                                className="w-5 h-5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center"
                                style={{ background: theme.color }}
                              >
                                {isSelected && <FaCheck size={8} className="text-white drop-shadow-sm" />}
                              </div>
                              <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                {theme.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Other Palettes */}
                      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        ✨ Other Palettes
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mb-3.5">
                        {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "other").map((theme) => {
                          const isSelected = sidebarTheme === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleSelectSidebarTheme(theme.id)}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${isSelected
                                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/30 scale-102"
                                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/90 hover:border-slate-300"
                                }`}
                              title={theme.name}
                            >
                              <div
                                className="w-4.5 h-4.5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center"
                                style={{ background: theme.color }}
                              >
                                {isSelected && <FaCheck size={7.5} className="text-white drop-shadow-sm" />}
                              </div>
                              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                {theme.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Color Section */}
                      <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
                        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span>🎨 Custom Color Picker</span>
                          {sidebarTheme === "custom" && (
                            <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs flex-shrink-0 cursor-pointer">
                            <input
                              type="color"
                              value={sidebarCustomHex}
                              onChange={(e) => handleSidebarCustomColorChange(e.target.value)}
                              className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 bg-transparent"
                              title="Pick custom sidebar color"
                            />
                          </div>
                          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 text-xs font-mono select-none">#</span>
                            <input
                              type="text"
                              value={sidebarCustomHex.replace("#", "")}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                                if (raw.length === 6) {
                                  handleSidebarCustomColorChange("#" + raw);
                                } else {
                                  setSidebarCustomHex("#" + raw);
                                }
                              }}
                              placeholder="001F54"
                              className="w-full text-xs font-mono font-bold text-slate-800 dark:text-white bg-transparent border-0 outline-hidden pl-1 uppercase"
                              maxLength={6}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSidebarCustomColorChange(sidebarCustomHex)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${sidebarTheme === "custom"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                              }`}
                          >
                            {sidebarTheme === "custom" ? "Applied" : "Apply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="glass-profile-chip flex items-center gap-2.5 rounded-2xl px-2.5 py-1.5 flex-1 min-w-0">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#343872] text-white flex-shrink-0 shadow-[0_4px_12px_-2px_rgba(52,56,114,0.4)]">
                    <FaUserCircle size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[#343872] dark:text-white truncate">
                      {user?.name || "User"}
                    </div>
                    <div className="text-[10.5px] text-gray-500 truncate">
                      {user?.roleId?.roleName || selectedCompany?.companyName || "Logged in"}
                    </div>
                  </div>
                </div>

                {/* Sidebar Theme Button (Expanded) */}
                <div className="relative" ref={colorPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowColorPicker((prev) => !prev)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200 cursor-pointer shadow-xs ${showColorPicker
                        ? "bg-slate-900 text-white border-slate-700 ring-2 ring-sky-500/40 scale-105"
                        : currentVisuals.isDark
                          ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                          : "bg-white/90 hover:bg-white border-slate-200/80 text-slate-700"
                      }`}
                    title="Customize Sidebar Theme & Colors"
                  >
                    <FaPalette size={12} className={showColorPicker ? "text-amber-400" : currentVisuals.isDark ? "text-sky-300" : "text-indigo-600"} />
                  </button>

                  {/* Floating Sidebar Theme Popover */}
                  {showColorPicker && (
                    <div className="absolute left-0 sm:left-full bottom-full sm:bottom-0 ml-0 sm:ml-2.5 mb-2 sm:mb-0 w-80 sm:w-96 max-h-[82vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-3.5 sm:p-4 z-[1090] animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
                      {/* Popover Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                            <FaPalette size={12} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white leading-none">Sidebar Color Theme</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Customize navigation bar background</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectSidebarTheme("default")}
                          className="text-[10.5px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                        >
                          <FaUndoAlt size={9} /> Reset
                        </button>
                      </div>

                      {/* Blue Shaders */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                          🌊 Blue Shades Collection
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          7 Shades
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mb-3.5">
                        {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "blue").map((theme) => {
                          const isSelected = sidebarTheme === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleSelectSidebarTheme(theme.id)}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${isSelected
                                  ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/50 shadow-xs ring-2 ring-sky-500/40 scale-102"
                                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-sky-50/50 hover:border-sky-300"
                                }`}
                              title={theme.name}
                            >
                              <div
                                className="w-5 h-5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center"
                                style={{ background: theme.color }}
                              >
                                {isSelected && <FaCheck size={8} className="text-white drop-shadow-sm" />}
                              </div>
                              <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                {theme.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Other Palettes */}
                      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        ✨ Other Palettes
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mb-3.5">
                        {SIDEBAR_PRESET_THEMES.filter((t) => t.category === "other").map((theme) => {
                          const isSelected = sidebarTheme === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleSelectSidebarTheme(theme.id)}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${isSelected
                                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/30 scale-102"
                                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/90 hover:border-slate-300"
                                }`}
                              title={theme.name}
                            >
                              <div
                                className="w-4.5 h-4.5 rounded-full shadow-xs border border-white/80 mb-1 flex items-center justify-center"
                                style={{ background: theme.color }}
                              >
                                {isSelected && <FaCheck size={7.5} className="text-white drop-shadow-sm" />}
                              </div>
                              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full text-center">
                                {theme.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Color Section */}
                      <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
                        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span>🎨 Custom Color Picker</span>
                          {sidebarTheme === "custom" && (
                            <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs flex-shrink-0 cursor-pointer">
                            <input
                              type="color"
                              value={sidebarCustomHex}
                              onChange={(e) => handleSidebarCustomColorChange(e.target.value)}
                              className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 bg-transparent"
                              title="Pick custom sidebar color"
                            />
                          </div>
                          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 text-xs font-mono select-none">#</span>
                            <input
                              type="text"
                              value={sidebarCustomHex.replace("#", "")}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                                if (raw.length === 6) {
                                  handleSidebarCustomColorChange("#" + raw);
                                } else {
                                  setSidebarCustomHex("#" + raw);
                                }
                              }}
                              placeholder="001F54"
                              className="w-full text-xs font-mono font-bold text-slate-800 dark:text-white bg-transparent border-0 outline-hidden pl-1 uppercase"
                              maxLength={6}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSidebarCustomColorChange(sidebarCustomHex)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${sidebarTheme === "custom"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                              }`}
                          >
                            {sidebarTheme === "custom" ? "Applied" : "Apply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .glass-sidebar {
          backdrop-filter: blur(36px) saturate(200%) brightness(1.03);
          -webkit-backdrop-filter: blur(36px) saturate(200%) brightness(1.03);
          box-shadow:
            inset -1px 0 0 rgba(255,255,255,0.9),
            inset 1px 0 1px rgba(255,255,255,1),
            8px 0 48px rgba(79,70,229,0.07),
            2px 0 0 rgba(99,102,241,0.05);
          position: relative;
        }
        .dark .glass-sidebar {
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        .glass-sidebar::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 220px;
          background: radial-gradient(120% 80% at 20% 0%, rgba(139,92,246,0.07) 0%, rgba(99,102,241,0.05) 35%, rgba(56,189,248,0.03) 70%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }
        .glass-sidebar-specular {
          background: radial-gradient(140% 60% at 15% 0%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 35%, transparent 65%);
          mix-blend-mode: overlay;
        }

        .glass-nav-item {
          color: #334155;
          transform: translateX(0);
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
        }
        .dark .glass-nav-item,
        .sidebar-dark-theme .glass-nav-item {
          color: #e2e8f0;
        }
        .glass-nav-item:hover {
          background: rgba(255,255,255,0.92);
          color: #0f172a;
          transform: translateX(3px);
          box-shadow: inset 0 1px 1px rgba(255,255,255,1), 0 2px 14px rgba(79,70,229,0.09);
        }
        .dark .glass-nav-item:hover,
        .sidebar-dark-theme .glass-nav-item:hover {
          background: rgba(255,255,255,0.14);
          color: #ffffff;
          transform: translateX(3px);
        }
        .glass-nav-item-active {
          background: rgba(255,255,255,0.98);
          color: #0f172a;
          transform: translateX(0) !important;
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,1),
            0 4px 22px rgba(79,70,229,0.16),
            0 1px 4px rgba(79,70,229,0.08);
        }
        .dark .glass-nav-item-active,
        .sidebar-dark-theme .glass-nav-item-active {
          background: rgba(255,255,255,0.18);
          color: #ffffff;
        }

        .glass-icon-chip {
          background: rgba(248,249,255,0.88);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.95), 0 2px 6px rgba(79,70,229,0.06);
          border: 1px solid rgba(99,102,241,0.12);
        }
        .dark .glass-icon-chip,
        .sidebar-dark-theme .glass-icon-chip {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.12);
        }

        .glass-profile-chip {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(99,102,241,0.12);
          box-shadow: inset 0 1px 1px rgba(255,255,255,1), 0 4px 16px rgba(79,70,229,0.08);
        }
        .dark .glass-profile-chip,
        .sidebar-dark-theme .glass-profile-chip {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.15);
        }
        .sidebar-dark-theme .glass-profile-chip div {
          color: #ffffff !important;
        }
        .sidebar-dark-theme .glass-profile-chip .text-gray-500 {
          color: #93c5fd !important;
        }

        .sidebar-submenu {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
          opacity: 0;
        }
        .sidebar-submenu.open {
          grid-template-rows: 1fr;
          opacity: 1;
        }
        .sidebar-submenu-inner {
          overflow: hidden;
        }
        .sidebar-submenu ul {
          border-left-color: rgba(99,102,241,0.22) !important;
        }

        .glass-sidebar a,
        .glass-sidebar button {
          text-decoration: none !important;
          outline: none;
        }
        .glass-sidebar a:hover,
        .glass-sidebar a:focus,
        .glass-sidebar a:active {
          text-decoration: none !important;
        }

        .sidebar-scroll {
          scrollbar-width: thin;
          scroll-behavior: smooth;
        }

        /* Responsive Mobile */
        @media (max-width: 991px) {
          .glass-sidebar {
            background: linear-gradient(160deg, rgba(248,249,255,0.98) 0%, rgba(240,244,255,0.96) 100%) !important;
            backdrop-filter: blur(36px) saturate(200%) brightness(1.03) !important;
            -webkit-backdrop-filter: blur(36px) saturate(200%) brightness(1.03) !important;
            border-right: 1px solid rgba(99,102,241,0.18) !important;
            box-shadow: 12px 0 60px rgba(79,70,229,0.18), inset 1px 0 1px rgba(255,255,255,0.95) !important;
          }
          .glass-sidebar .glass-nav-item {
            color: #1e293b !important;
            min-height: 44px !important;
          }
          .glass-sidebar .glass-nav-item:hover {
            background: rgba(255, 255, 255, 0.92) !important;
            color: #0f172a !important;
          }
          .glass-sidebar .glass-nav-item-active {
            background: rgba(255, 255, 255, 0.98) !important;
            color: #0f172a !important;
            box-shadow: inset 0 1px 1px #ffffff, 0 4px 22px rgba(79,70,229,0.16) !important;
          }
          .glass-sidebar .group\/sub {
            color: #334155 !important;
            min-height: 38px !important;
          }
          .glass-sidebar .group\/sub:hover {
            background: rgba(255, 255, 255, 0.8) !important;
            color: #0f172a !important;
          }
          .glass-sidebar .glass-profile-chip {
            background: rgba(255, 255, 255, 0.92) !important;
            border: 1px solid rgba(99, 102, 241, 0.15) !important;
          }
          .glass-sidebar .glass-profile-chip div {
            color: #0f172a !important;
          }
          .glass-sidebar .glass-profile-chip .text-gray-500 {
            color: #64748b !important;
          }
          .glass-sidebar .text-gray-600,
          .glass-sidebar .text-gray-500,
          .glass-sidebar .text-gray-400 {
            color: #475569 !important;
          }
          .glass-sidebar .glass-icon-chip {
            background: rgba(248, 249, 255, 0.92) !important;
            border-color: rgba(99, 102, 241, 0.15) !important;
          }
        }
        .glass-sidebar:has(.px-2) .sidebar-scroll {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .glass-sidebar:has(.px-2) .sidebar-scroll::-webkit-scrollbar {
          display: none !important;
          width: 0px !important;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(99, 102, 241, 0.22);
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