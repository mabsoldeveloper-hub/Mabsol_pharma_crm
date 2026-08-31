"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";

/* useLayoutEffect throws a warning during SSR, so fall back to useEffect there. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealState = "idle" | "hidden" | "visible";

/**
 * Reveal-on-scroll hook.
 * - Elements already inside the viewport on mount become visible immediately
 *   (no flash of invisible content on first paint).
 * - Elements below the fold start hidden and animate in once they intersect.
 */
function useReveal<T extends HTMLElement = HTMLElement>(
  threshold = 0.15
): [RefObject<T | null>, RevealState] {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>("idle");

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setState("visible");
      return undefined;
    }

    const rect = node.getBoundingClientRect();
    const alreadyInView =
      rect.top < window.innerHeight * (1 - threshold) && rect.bottom > 0;

    if (alreadyInView) {
      setState("visible");
      return undefined;
    }

    setState("hidden");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, state];
}

/* ============================================================
   NETWORK FIELD — a slowly rotating 3D sphere of connected nodes,
   rendered on a fixed full-viewport canvas so it runs continuously
   behind the whole page (not just the hero) as the user scrolls.
   Nodes are generated once on a sphere (Fibonacci distribution),
   nearest-neighbour edges are computed once, and every frame we
   just rotate + project that fixed structure — cheap, and it reads
   as a genuine 3D object rather than random floating dots.
   ============================================================ */
type Point3 = { x: number; y: number; z: number };

function fibonacciSphere(count: number, radius: number): Point3[] {
  const pts: Point3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1..1
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    pts.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return pts;
}

function nearestNeighborEdges(pts: Point3[], k: number): [number, number][] {
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < pts.length; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const dz = pts[i].z - pts[j].z;
      dists.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let n = 0; n < k; n++) {
      const j = dists[n].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

function NetworkField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const NODE_COUNT = 60;
    const points = fibonacciSphere(NODE_COUNT, 1);
    const edges = nearestNeighborEdges(points, 2);

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let angleY = 0;
    let angleX = 0.4;
    let raf = 0;
    let visible = true;

    function draw(t: number) {
      if (!ctx) return;
      const isMobile = width < 768;
      const cx = isMobile ? width * 0.5 : width * 0.72;
      const cy = isMobile ? height * 0.28 : height * 0.34;
      const radius = Math.min(width, height) * (isMobile ? 0.38 : 0.42);
      const fov = radius * 2.6;

      if (!reduced) {
        angleY = t * 0.00012;
        angleX = 0.4 + Math.sin(t * 0.00007) * 0.12;
      }

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const projected = points.map((p) => {
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2 * radius);
        return {
          x: cx + x1 * radius * scale,
          y: cy + y2 * radius * scale,
          scale,
        };
      });

      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      edges.forEach(([a, b]) => {
        const pa = projected[a];
        const pb = projected[b];
        const avgScale = (pa.scale + pb.scale) / 2;
        const opacity = Math.max(0, Math.min(0.15, (avgScale - 0.7) * 0.35));
        ctx.strokeStyle = `rgba(52, 56, 114, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });

      projected.forEach((p, i) => {
        const size = Math.max(0.6, (p.scale - 0.6) * 3);
        const isOrange = i % 5 === 0;
        const opacity = Math.max(0.08, Math.min(0.75, (p.scale - 0.55) * 1.5));
        ctx.beginPath();
        ctx.fillStyle = isOrange
          ? `rgba(251, 140, 0, ${opacity})`
          : `rgba(102, 104, 160, ${opacity})`;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reduced && visible) {
        raf = requestAnimationFrame(draw);
      }
    }

    raf = requestAnimationFrame(draw);

    function handleVisibility() {
      visible = document.visibilityState === "visible";
      if (visible && !reduced) {
        raf = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(raf);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-field" aria-hidden="true" />;
}

interface RevealProps {
  as?: ElementType;
  className?: string;
  delay?: number;
  children?: ReactNode;
  id?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  children,
  ...rest
}: RevealProps) {
  const [ref, state] = useReveal<HTMLElement>();
  const stateClass =
    state === "hidden" ? "reveal-hidden" : state === "visible" ? "reveal-in" : "";

  return (
    <Tag
      ref={ref}
      className={`reveal ${stateClass} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ============================================================
   ALL FEATURES DATA — complete catalog of every built feature
   ============================================================ */
const ALL_FEATURES = [
  {
    category: "📊 Dashboard & Analytics",
    color: "#6366f1",
    gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    features: [
      { name: "Multi-Tab Dashboard", desc: "Overview, Sales, Inventory, Credit, Purchase tabs with live ERP-synced data in one screen." },
      { name: "Executive AI Dashboard", desc: "AI-powered insights with Target Radar Chart, Credit Risk Quadrant, Detailing Funnel Chart & Financial Simulator." },
      { name: "KPI Cards", desc: "Animated KPI cards showing Total Sales, Purchase, Outstanding, Stock value with trend indicators." },
      { name: "Liquid Meters", desc: "Beautiful animated liquid-fill gauges for target achievement, collection rate and stock levels." },
      { name: "Analytics Cards", desc: "Compact metric tiles for area-wise and division-wise breakdowns." },
      { name: "Dashboard Charts", desc: "Recharts-powered bar, line, area, radar and pie charts for Sales, Purchase and Credit analytics." },
      { name: "Smart Insights Widget", desc: "Auto-generated text summaries of KPIs with alerts and business intelligence bullets." },
      { name: "Financial Simulator", desc: "Scenario modelling tool — adjust pricing/volumes and instantly project impact on revenue." },
      { name: "India Map Area Breakdown", desc: "Visual India state map with area-wise sales heat-map and drill-down." },
      { name: "Banner Theme Customiser", desc: "13+ preset colour themes (Blue Shaders, Emerald, Rose, Amber, Midnight) for the dashboard banner + custom colour picker." },
      { name: "Auto Time-Based Theme", desc: "Dashboard banner automatically switches gradient by time of day (Morning/Afternoon/Evening/Night)." },
      { name: "60-Second Auto-Refresh", desc: "Live ERP data refreshes every 60 seconds without any manual action." },
    ],
  },
  {
    category: "💰 Sales Module",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
    features: [
      { name: "Sales Overview Cards", desc: "Today's sales, monthly totals, top products and YTD summary cards with sparklines." },
      { name: "Customer-Wise Sales Table", desc: "Drill down into every customer's sales history, outstanding balance and last transaction." },
      { name: "Recent Bills List", desc: "Live-updating list of latest invoices from ERP with amount, date and status." },
      { name: "Top Products by Sales", desc: "Ranked product table with quantity sold, revenue and margin data." },
      { name: "Total Sales Modal", desc: "Detailed full-screen sales breakdown with product-wise, area-wise and period filters." },
      { name: "FY Radar / Area Radar Detail Modals", desc: "Financial-year radar and area-level radar drill-down modals with comparison overlays." },
      { name: "Sales vs Collection Analytics", desc: "Side-by-side comparison of billed amount vs cash collected with gap analysis charts." },
    ],
  },
  {
    category: "🛒 Purchase Module",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
    features: [
      { name: "Purchase Dashboard", desc: "Dedicated purchase dashboard with KPIs for total purchase, vendor count, pending payments." },
      { name: "Purchase Order Form", desc: "Full PO creation form with product search, batch entry, GST calculation and supplier selection." },
      { name: "Purchase Orders List", desc: "Paginated list of all POs with status filters (Pending/Received/Cancelled) and export." },
      { name: "Purchase Bill Form", desc: "GST-compliant purchase bill entry with batch number, expiry date and batch-wise stock update." },
      { name: "Purchase Bills List", desc: "Complete bill register with search, date filter and payment status tracking." },
      { name: "AI Purchase Bill Entry", desc: "Upload a photo of any purchase bill — AI extracts all line items, batches, rates and GST automatically." },
      { name: "Supplier History Panel", desc: "See all past transactions, outstanding balances and payment history for any supplier." },
      { name: "Purchase vs Payment Analytics", desc: "Visual gap chart comparing total purchase amount against payments made per period." },
      { name: "Total Purchase Modal", desc: "Drill-down modal showing product-wise purchase detail for any period." },
    ],
  },
  {
    category: "📦 Inventory & Stock",
    color: "#0ea5e9",
    gradient: "linear-gradient(135deg,#0ea5e9,#0284c7)",
    features: [
      { name: "Inventory Overview Cards", desc: "Total SKUs, total stock value, negative stock count and near-expiry count at a glance." },
      { name: "Company-Wise Summary", desc: "Break down stock data per ERP company with tabs." },
      { name: "Top Products Table", desc: "Best-selling and high-value product ranking with quantity and value columns." },
      { name: "Low Stock Table", desc: "All products below reorder level highlighted with current qty and threshold." },
      { name: "Negative Stock Table", desc: "Products in negative stock (data-entry issues) flagged for correction." },
      { name: "Current Stock Modal", desc: "Full searchable, sortable stock ledger with batch-wise detail, expiry dates and location." },
      { name: "Near-Expiry Batches Modal", desc: "Batches expiring in 30/60/90 days with colour-coded urgency and quantity." },
      { name: "Expired Batches Modal", desc: "Complete list of expired stock for write-off or return processing." },
    ],
  },
  {
    category: "👥 Customer Management",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    features: [
      { name: "Customer List & Search", desc: "Paginated customer directory with global search, area and category filters." },
      { name: "Customer Profile Page", desc: "360° customer view with contact info, outstanding, sales history and ledger." },
      { name: "Customer Overview Cards", desc: "Outstanding balance, total purchases, last invoice date summary for each customer." },
      { name: "Add / Edit Customer Modal", desc: "Full customer creation form with GST number, area, route, category and contact fields." },
      { name: "Customer Quick Actions", desc: "One-click access to call, WhatsApp, view ledger or create order from customer card." },
      { name: "Ledger Details Modal", desc: "Full debit/credit ledger for any customer with date-range filter and balance tracking." },
      { name: "Credit Risk Dashboard", desc: "Credit Risk Quadrant chart plotting customers by outstanding vs payment behaviour." },
    ],
  },
  {
    category: "🎯 Leads & CRM Pipeline",
    color: "#f43f5e",
    gradient: "linear-gradient(135deg,#f43f5e,#e11d48)",
    features: [
      { name: "Lead Kanban Board", desc: "Drag-and-drop Kanban with stages: New → Contacted → Qualified → Proposal → Won/Lost." },
      { name: "Lead Table View", desc: "Sortable, filterable table view of all leads with status badges and assigned MR." },
      { name: "Lead Form Modal", desc: "Comprehensive lead capture form with source, product interest, priority and follow-up date." },
      { name: "Lead Detail Drawer", desc: "Side-drawer with full lead history, activity timeline, notes and conversion actions." },
      { name: "Lead Source Analytics", desc: "Funnel chart showing lead sources, conversion rates and stage-wise counts." },
    ],
  },
  {
    category: "🧑‍⚕️ MR Reporting (Field Force)",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg,#06b6d4,#0891b2)",
    features: [
      { name: "DCR Submission", desc: "Medical Representatives submit Daily Call Reports with doctor, chemist and stockist visits." },
      { name: "DCR History", desc: "Full history of all submitted DCRs with filters by date, status and MR." },
      { name: "Call Log Entry", desc: "Log individual calls with party name, speciality, visit shift, product detailing and POB amount." },
      { name: "DCR Approval Workflow", desc: "Admin approves or rejects DCR entries with remarks — full approval trail maintained." },
      { name: "MR Territory Management", desc: "Assign specific companies, areas and customer groups to each MR with access restriction." },
      { name: "MR Customer Assignment", desc: "Map customers to MRs so field reps only see their relevant accounts." },
      { name: "Target vs Achievement Radar", desc: "Radar chart comparing MR-wise targets against actual calls and POB." },
      { name: "Detailing Funnel", desc: "Funnel visualization from calls → samples → prescriptions → orders for field effectiveness." },
      { name: "DCR Excel Export", desc: "Export DCR history to Excel for offline reporting and payroll." },
    ],
  },
  {
    category: "📋 Reports & Analytics",
    color: "#84cc16",
    gradient: "linear-gradient(135deg,#84cc16,#65a30d)",
    features: [
      { name: "Sales Reports", desc: "Period-wise, customer-wise, product-wise and area-wise sales reports with charts." },
      { name: "Purchase Reports", desc: "Supplier-wise and product-wise purchase register with GST breakdowns." },
      { name: "Inventory Reports", desc: "Stock valuation, movement and ageing reports exportable to Excel." },
      { name: "Outstanding Reports", desc: "Customer-wise outstanding with ageing buckets (0-30, 31-60, 61-90, 90+ days)." },
      { name: "GST Reports", desc: "GSTR-1, GSTR-2A / B reconciliation and HSN-wise summary reports." },
      { name: "Financial Year Comparison", desc: "Year-on-year growth comparison charts for Sales, Purchase and Collection." },
      { name: "Area & Division Reports", desc: "Drill-down reports by geographic area and product division." },
      { name: "Purchase-Sales Analytics", desc: "Combined purchase vs sales analytics with margin and category breakdowns." },
    ],
  },
  {
    category: "📧 Communication & Campaigns",
    color: "#ec4899",
    gradient: "linear-gradient(135deg,#ec4899,#db2777)",
    features: [
      { name: "Email Campaign Manager", desc: "Design and send HTML email campaigns to customer segments with open-rate tracking." },
      { name: "WhatsApp Campaign", desc: "Send bulk WhatsApp messages to customer lists via configured WABA integration." },
      { name: "Notification Center", desc: "In-app notification bell with stock alerts, expiry warnings and sync status updates." },
    ],
  },
  {
    category: "📝 Custom Forms (Form Studio)",
    color: "#a855f7",
    gradient: "linear-gradient(135deg,#a855f7,#9333ea)",
    features: [
      { name: "AI Form Studio", desc: "Describe a form in plain English — AI generates the full form schema with all fields instantly." },
      { name: "Visual Form Builder", desc: "Drag-and-drop builder with 15+ field types: text, number, date, dropdown, file, signature, GPS and more." },
      { name: "Pharma Templates", desc: "Pre-built form templates for Doctor Visit, Chemist Survey, Adverse Event, Order Form and more." },
      { name: "Conditional Logic Editor", desc: "Show/hide fields based on other field values using a no-code logic builder." },
      { name: "Repeater Table Fields", desc: "Add unlimited repeated row entries (like order line items) inside a single form." },
      { name: "GPS Location Picker", desc: "Capture exact GPS coordinates from the field with map preview inside the form." },
      { name: "Signature Pad", desc: "Digital signature capture field with touch/mouse support for consent forms." },
      { name: "File Upload Field", desc: "Photo and document upload fields with preview and cloud storage." },
      { name: "Dynamic Form Renderer", desc: "Public and internal form submission pages with validation, auto-save and mobile support." },
      { name: "Form Analytics View", desc: "Response counts, completion rates and field-level analytics for each form." },
      { name: "PDF Print / Export", desc: "Generate a styled PDF of any form submission with company branding." },
      { name: "Form Share Modal", desc: "Share forms via public link or embed code — no login required for external respondents." },
      { name: "Dynamic Table View", desc: "View all responses in a filterable, sortable table with column selector." },
      { name: "Dynamic Filter Bar", desc: "Filter form submissions by any field value with AND/OR logic." },
    ],
  },
  {
    category: "🏢 Master Data Management",
    color: "#64748b",
    gradient: "linear-gradient(135deg,#64748b,#475569)",
    features: [
      { name: "Company Master", desc: "Manage multiple ERP companies with GSTIN, address, logo and financial year settings." },
      { name: "Category Master", desc: "Create and manage product categories and sub-categories for classification." },
      { name: "Division Master", desc: "Define product divisions (e.g., Cardio, Ortho, Gynae) for area-wise reporting." },
      { name: "Sub-Division Master", desc: "Granular sub-division groupings under each division for detailed analytics." },
      { name: "Area / Territory Master", desc: "Geographic area definitions linked to MR territories and sales regions." },
      { name: "Product Master", desc: "Full product catalogue with HSN code, pack size, MRP, PTR, PTS and tax rate." },
      { name: "Add / Edit Product Modal", desc: "Rich product creation form with image upload, batch tracking toggle and category mapping." },
    ],
  },
  {
    category: "🔐 Users, Roles & Permissions",
    color: "#ef4444",
    gradient: "linear-gradient(135deg,#ef4444,#dc2626)",
    features: [
      { name: "User Management Table", desc: "List all users with role, status, last login and quick actions (edit, delete, reset password)." },
      { name: "Role Management", desc: "Create custom roles (Admin, Manager, MR, Accountant, etc.) with descriptive labels." },
      { name: "Granular Permissions", desc: "Toggle 100+ individual permissions per role or per user — module-level and action-level." },
      { name: "Permission Gate Components", desc: "UI elements auto-hide or disable based on logged-in user's permissions." },
      { name: "MR Territory Restriction", desc: "MR users see only their assigned companies, areas and customers — not the full database." },
      { name: "Menu Adjustments", desc: "Admin can show/hide sidebar menu items per role without code changes." },
      { name: "User Registration", desc: "Self-registration with email verification or admin-created accounts with role assignment." },
      { name: "JWT Authentication", desc: "Secure cookie-based JWT tokens with auto-expiry and refresh logic." },
    ],
  },
  {
    category: "⚙️ Settings & Customisation",
    color: "#0891b2",
    gradient: "linear-gradient(135deg,#0891b2,#0e7490)",
    features: [
      { name: "Company Settings", desc: "Configure company info, logo, GST number, financial year, default currency and timezone." },
      { name: "Sidebar Theme Picker", desc: "13 sidebar themes (Deep Navy, Cobalt Tech, Emerald Mint, Sunset Rose, etc.) + custom colour." },
      { name: "Dashboard Banner Themes", desc: "Separate theme picker for the dashboard banner with 14+ options including Auto mode." },
      { name: "Voice Settings", desc: "Configure voice announcement preferences for alerts and dashboard narration." },
      { name: "Website Animations Toggle", desc: "Enable or disable all UI animations site-wide for accessibility or performance." },
      { name: "Profile Management", desc: "Edit name, email, profile photo upload, change password and personal preferences." },
      { name: "VFP Sync Config Wizard", desc: "Step-by-step wizard to configure the ERP (Visual FoxPro) sync with folder paths and schedule." },
      { name: "VFP Sync Actions", desc: "Manual trigger, schedule config and sync log viewer for ERP data synchronisation." },
      { name: "Financial Year Switcher", desc: "Switch active financial year from the top bar — all reports update instantly." },
      { name: "Multi-Company Switcher", desc: "Switch between multiple ERP companies from the topbar — data scoped per selection." },
    ],
  },
  {
    category: "🌐 UI & UX Highlights",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#f59e0b,#f97316)",
    features: [
      { name: "Global Search (Cmd+K)", desc: "Spotlight-style instant search across customers, products, invoices and all modules." },
      { name: "Celestial Cursor", desc: "Premium custom animated cursor with particle trail effect across the app." },
      { name: "Pharma Background Canvas", desc: "Animated scientific molecule canvas on login/landing for brand identity." },
      { name: "Responsive Layout", desc: "Full mobile-responsive sidebar, topbar and all pages — works on tablet and phone." },
      { name: "Fullscreen Mode", desc: "One-click fullscreen toggle in topbar for distraction-free dashboard viewing." },
      { name: "Searchable Select Dropdowns", desc: "All select fields are searchable with keyboard navigation for fast data entry." },
      { name: "Real-time Notifications Bell", desc: "Topbar bell icon with badge count, notification list and mark-as-read." },
      { name: "Sidebar Collapse", desc: "Collapse sidebar to icon-only mode for maximum content area on smaller screens." },
      { name: "Dark Sidebar Themes", desc: "Multiple dark colour themes for the sidebar including Deep Navy and Cyber Neon." },
      { name: "Reveal-on-Scroll Animations", desc: "Smooth fade-in animations for all content sections as user scrolls." },
      { name: "Public Form Portal", desc: "External users can submit forms via public URL without any login." },
    ],
  },
  {
    category: "🔄 ERP Sync & Integration",
    color: "#22c55e",
    gradient: "linear-gradient(135deg,#22c55e,#16a34a)",
    features: [
      { name: "Visual FoxPro (VFP) Sync", desc: "Reads DBF files from VFP/ERP automatically — no API changes needed in ERP." },
      { name: "Automated Sync Schedule", desc: "Configure sync interval (default 60s) or run manually from the VFP Sync Actions panel." },
      { name: "Sync Status Dashboard", desc: "Live sync status indicator, last sync time and error log in the Mabsol CRM Sync section." },
      { name: "Multi-Company ERP Sync", desc: "Sync data from multiple ERP company databases simultaneously." },
      { name: "Bill Document Parser", desc: "AI-powered API that reads purchase bill photos and extracts structured data via OCR." },
      { name: "Cloud Backup", desc: "All synced data stored securely in MongoDB Atlas with encrypted backups." },
    ],
  },
];

export default function LandingPage() {
  const bars = [30, 48, 40, 72, 54, 64, 46];
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredFeatures = ALL_FEATURES.map((cat) => ({
    ...cat,
    features: cat.features.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.category.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) =>
    searchQuery ? cat.features.length > 0 : activeCategory ? cat.category === activeCategory : true
  );

  const totalFeatures = ALL_FEATURES.reduce((a, c) => a + c.features.length, 0);

  // Category tabs scroll & drag state for desktop PC support
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const [tabsStartX, setTabsStartX] = useState(0);
  const [tabsScrollLeft, setTabsScrollLeft] = useState(0);

  // Direct native mouse wheel listener for category tabs (translates vertical mouse wheel into horizontal scroll on desktop)
  useEffect(() => {
    if (!featuresOpen) return;
    const el = tabsRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      // Scroll horizontally smoothly with mouse wheel
      el.scrollLeft += e.deltaY * 1.2;
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, [featuresOpen, searchQuery]);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleTabsMouseDown = (e: React.MouseEvent) => {
    if (!tabsRef.current) return;
    setIsDraggingTabs(true);
    setTabsStartX(e.pageX - tabsRef.current.offsetLeft);
    setTabsScrollLeft(tabsRef.current.scrollLeft);
  };

  const handleTabsMouseUpOrLeave = () => {
    setIsDraggingTabs(false);
  };

  const handleTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabs || !tabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - tabsStartX) * 1.5;
    tabsRef.current.scrollLeft = tabsScrollLeft - walk;
  };

  const steps = [
    {
      n: "01",
      title: "ERP generates data",
      body: "Invoices, stock and accounts get created in ERP exactly like today. Nothing changes there.",
    },
    {
      n: "02",
      title: "Mabsol CRM syncs it",
      body: "Every change flows in on its own. No exports, no CSVs, no retyping numbers.",
    },
    {
      n: "03",
      title: "Your team sees it instantly",
      body: "Live reports and alerts land wherever your team already works.",
    },
  ];

  // Small orbiting data-packet particles around the hero stage — a nod to
  // records flowing from ERP into the CRM in real time.
  const particles = [
    { top: "8%", left: "-6%", size: 8, delay: 0, duration: 7 },
    { top: "72%", left: "-10%", size: 6, delay: 1.4, duration: 8.5 },
    { top: "18%", left: "104%", size: 7, delay: 0.6, duration: 6.5 },
    { top: "55%", left: "108%", size: 5, delay: 2.1, duration: 9 },
    { top: "92%", left: "40%", size: 6, delay: 1, duration: 7.5 },
  ];

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const node = frameRef.current;
    if (reducedMotion || !node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 12 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <main className="landing-page">
      {/* AMBIENT BACKGROUND — fixed to the viewport so it runs continuously
          behind the whole scrolling page: a slowly rotating 3D node network
          plus two soft drifting color fields, reinforcing "always syncing" */}
      <div className="bg-ambient" aria-hidden="true">
        <span className="orb orb-orange" />
        <span className="orb orb-navy" />

        {/* PEEKING & FADING BACKGROUND TELEMETRY STICKERS */}
        <div className="bg-sticker bg-sticker-pie">
          <div className="chart-head">
            <span className="chart-label">Sales Mix</span>
            <span className="chart-tag">+24%</span>
          </div>
          <div className="pie-visual">
            <svg viewBox="0 0 36 36" className="pie-svg">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#EEF0F8" strokeWidth="5" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#FB8C00"
                strokeWidth="5"
                strokeDasharray="65 100"
                strokeDashoffset="25"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#343872"
                strokeWidth="5"
                strokeDasharray="35 100"
                strokeDashoffset="90"
              />
            </svg>
            <div className="pie-legend">
              <span className="legend-item"><i className="leg-dot leg-orange" /> Pharma 65%</span>
              <span className="legend-item"><i className="leg-dot leg-navy" /> OTC 35%</span>
            </div>
          </div>
        </div>

        <div className="bg-sticker bg-sticker-stock">
          <span className="notif-dot dot-green" />
          <div>
            <p className="notif-title">Stock Synced</p>
            <p className="notif-sub">2,22,190 Units</p>
          </div>
        </div>

        <div className="bg-sticker bg-sticker-spark">
          <div className="chart-head">
            <span className="chart-label">Live Sales Trend</span>
            <span className="live-dot-pulse" />
          </div>
          <svg viewBox="0 0 120 35" className="sparkline-svg">
            <path
              d="M0,28 Q20,12 40,22 T80,8 T120,18"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="bg-sticker bg-sticker-sync">
          <span className="sync-icon">⚡</span>
          <div>
            <p className="notif-title">Real-Time ERP Sync</p>
            <p className="notif-sub">Auto 60s Refresh</p>
          </div>
        </div>

        <div className="bg-sticker bg-sticker-toast">
          <span className="notif-dot dot-orange" />
          <div>
            <p className="notif-title">Invoice #INV-2291 synced</p>
            <p className="notif-sub">2 seconds ago</p>
          </div>
        </div>

        <NetworkField />
      </div>

      {/* NAVBAR */}
      <header className="nav">
        <div className="nav-inner">
          <a href="#product" className="brand">
            <img
              src="https://mabsolinfotech.com/images/logo.webp"
              alt="Mabsol Infotech"
              className="brand-logo"
            />
          </a>

          <nav className="nav-links">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <button onClick={() => setFeaturesOpen(true)} className="nav-all-features-btn">All Features</button>
          </nav>

          <a
            href="/login"
            className="btn btn-primary nav-btn"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="product">
        <Reveal className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot-sm" /> ERP Integration
          </span>
          <h1>
            Everything from ERP,
            <br />
            in <span className="accent">one screen</span>
          </h1>
          <p className="sub">
            Mabsol CRM pulls straight from ERP to give your team live
            reports and instant alerts, so nothing gets missed and no one
            has to dig for numbers.
          </p>
          <div className="hero-actions">
            <a
              href="/login"
              className="btn btn-primary"
            >
              Get Started
            </a>
            <a href="#how" className="btn btn-outline">
              See how it works
            </a>
            <button
              onClick={() => setFeaturesOpen(true)}
              className="btn btn-features-doc"
            >
              <span className="btn-features-icon">📋</span>
              View All Features
              <span className="btn-features-badge">{totalFeatures}+</span>
            </button>
          </div>

          <div className="hero-trust">
            <div className="trust-avatars" aria-hidden="true">
              <span className="trust-dot dot-orange" />
              <span className="trust-dot dot-navy" />
              <span className="trust-dot dot-green" />
            </div>
            <span>Trusted by teams already running ERP + CRM together</span>
          </div>
        </Reveal>

        {/* PRODUCT SCREENSHOT / BENTO DASHBOARD — 3D TILT STAGE */}
        <Reveal className="hero-stage" delay={120}>
          <div className="stage-3d">
            <span className="stage-glow" aria-hidden="true" />
            <div className="ghost-panel ghost-panel-back" />
            <div className="ghost-panel ghost-panel-mid" />

            {particles.map((p, i) => (
              <span
                key={i}
                className="particle"
                style={
                  {
                    top: p.top,
                    left: p.left,
                    width: p.size,
                    height: p.size,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                  } as CSSProperties
                }
              />
            ))}

            <div
              className="browser-frame"
              ref={frameRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              }}
            >
              <div className="browser-top">
                <div className="browser-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <span className="browser-url">phcrm.mabsolinfotech.cloud</span>
                <span className="live-pill">
                  <span className="live-dot" />
                  Live
                </span>
              </div>

              <div className="hero-banner-wrapper">
                <img
                  src="/uploads/index-banner.png"
                  alt="Mabsol Pharma CRM Dashboard"
                  className="hero-banner-image"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS — horizontal timeline */}
      <section className="how" id="how">
        <Reveal as="div" className="section-head">
          <span className="eyebrow eyebrow-dark">The flow</span>
          <h2>From ERP to your team, automatically</h2>
        </Reveal>

        <div className="timeline">
          <span className="timeline-line" aria-hidden="true">
            <span className="timeline-pulse" />
          </span>
          {steps.map((s, i) => (
            <Reveal as="div" className="timeline-step" key={s.n} delay={i * 120}>
              <div className="node-wrapper">
                <span className="timeline-node">{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="step-hover-badge">
                <span>
                  {i === 0
                    ? "⚡ VFP DBF Records Generated"
                    : i === 1
                    ? "🔄 Auto Cloud Sync Active"
                    : "📊 Live Team Dashboard Updated"}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURES — asymmetric bento */}
      <section className="feature-bento" id="features">
        <Reveal as="div" className="section-head">
          <span className="eyebrow eyebrow-dark">Inside the CRM</span>
          <h2>Built around one job: never lose track of ERP</h2>
        </Reveal>

        <div className="fb-grid">
          <Reveal as="div" className="fb-card fb-large">
            <div className="fb-card-header">
              <div className="fb-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20V10M12 20V4M20 20v-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="bar-hover-tag">₹2.03 Cr Sales Radar</span>
            </div>
            <h3>Report section</h3>
            <p>
              Sales, stock and account reports from ERP, laid out in one
              clean CRM view that&apos;s always current — no exports, no
              waiting on someone to send a file.
            </p>
            <div className="fb-visual">
              <div className="mini-bars mini-bars-large">
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className={`eq-bar eq-bar-${i}`}
                    style={
                      {
                        height: `${h}%`,
                        "--bar-h": `${h}%`,
                        "--bar-delay": `${i * 120}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal as="div" className="fb-card fb-card-notif" delay={120}>
            <div className="fb-icon bell-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a5 5 0 0 0-5 5v3.5L5 15h14l-2-3.5V8a5 5 0 0 0-5-5Z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M10 18a2 2 0 0 0 4 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>Notifications</h3>
            <p>Know the second something changes in ERP, without opening two apps.</p>
            <div className="hover-notif-row">
              <span className="notif-dot dot-orange" />
              <span>Instant Alert: Stock Below Threshold</span>
            </div>
          </Reveal>

          <Reveal as="div" className="fb-card fb-card-sync" delay={220}>
            <div className="fb-icon sync-spin-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 4v5h5M20 20v-5h-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.6 15A8 8 0 0 0 19 15.5M19.4 9A8 8 0 0 0 5 8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>ERP sync</h3>
            <p>Works with the ERP setup you already have. No migration, no new habits.</p>
            <div className="hover-sync-bar">
              <div className="hover-sync-fill" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA BAND — LIGHT GLASS CARD WITH WATERMARK CHARTS & HOVER TELEMETRY */}
      <Reveal as="section" className="cta-band">
        <span className="cta-glow" aria-hidden="true" />
        <span className="cta-border-glow" aria-hidden="true" />

        {/* HOVER WATERMARK CHARTS IN CARD BACKGROUND */}
        <svg className="cta-bg-donut" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <circle cx="50" cy="50" r="38" stroke="#EEF0F8" strokeWidth="12" />
          <circle cx="50" cy="50" r="38" stroke="#FB8C00" strokeWidth="12" strokeDasharray="160 240" strokeDashoffset="40" />
          <circle cx="50" cy="50" r="38" stroke="#6366F1" strokeWidth="12" strokeDasharray="80 240" strokeDashoffset="200" />
        </svg>

        <svg className="cta-bg-bars" viewBox="0 0 120 70" fill="none" aria-hidden="true">
          <rect x="5" y="40" width="16" height="30" rx="3" fill="#FB8C00" />
          <rect x="28" y="25" width="16" height="45" rx="3" fill="#6366F1" />
          <rect x="51" y="10" width="16" height="60" rx="3" fill="#22C55E" />
          <rect x="74" y="30" width="16" height="40" rx="3" fill="#FB8C00" />
          <rect x="97" y="18" width="16" height="52" rx="3" fill="#343872" />
        </svg>

        <svg className="cta-bg-spark" viewBox="0 0 300 60" fill="none" aria-hidden="true">
          <path
            d="M0,45 Q50,15 100,35 T200,10 T300,30"
            stroke="#22C55E"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* HOVER TELEMETRY BADGES */}
        <div className="cta-hover-badge badge-tl">
          <span className="live-dot-sm" /> 100% Live ERP Bridge
        </div>
        <div className="cta-hover-badge badge-tr">
          <span>📈 ₹2.03 Cr Tracked</span>
        </div>
        <div className="cta-hover-badge badge-bl">
          <span>🛡️ Encrypted Backup</span>
        </div>
        <div className="cta-hover-badge badge-br">
          <span>⚡ Auto 60s Refresh</span>
        </div>

        <span className="cta-eyebrow">
          <span className="live-dot-sm" /> Instant Setup • Zero Downtime
        </span>
        <h2>Stop switching between ERP and spreadsheets</h2>
        <p>Set up takes minutes. Your team keeps working the same way, just with everything in view.</p>
        
        <div className="cta-action-wrap">
          <a href="/login" className="btn btn-primary cta-btn-light">
            <span>Get Started Free</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="cta-arrow">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </Reveal>

      {/* FOOTER */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Mabsol Infotech. Created by Mabsol Team.</p>
      </footer>

      {/* ================================================================
          ALL FEATURES FULL-SCREEN MODAL OVERLAY
          ================================================================ */}
      {featuresOpen && (
        <div className="features-overlay" role="dialog" aria-modal="true" aria-label="All Features Documentation">
          {/* Backdrop */}
          <div className="features-backdrop" onClick={() => { setFeaturesOpen(false); setSearchQuery(""); setActiveCategory(null); }} />

          {/* Panel */}
          <div className="features-panel">
            {/* Header */}
            <div className="fp-header">
              <div className="fp-header-top-bar">
                <div className="fp-badge-group">
                  <span className="fp-badge">📋 Documentation</span>
                  <span className="fp-count-pill">{totalFeatures} Features</span>
                </div>
                <button
                  className="fp-close"
                  onClick={() => { setFeaturesOpen(false); setSearchQuery(""); setActiveCategory(null); }}
                  aria-label="Close Documentation"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="fp-header-content">
                <div className="fp-header-info">
                  <h2 className="fp-title">Mabsol Pharma CRM — Complete Feature Catalog</h2>
                  <p className="fp-subtitle">
                    Complete breakdown of <strong>{ALL_FEATURES.length} modules</strong> & <strong>{totalFeatures} features</strong>.
                  </p>
                </div>

                <div className="fp-search-wrap">
                  <span className="fp-search-icon">🔍</span>
                  <input
                    type="text"
                    className="fp-search"
                    placeholder="Search all features, modules…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
                  />
                  {searchQuery && (
                    <button className="fp-search-clear" onClick={() => setSearchQuery("")} title="Clear search">✕</button>
                  )}
                </div>
              </div>
            </div>

            {/* Category pills - clean horizontal strip with mouse wheel scroll */}
            {!searchQuery && (
              <div
                className="fp-cat-pills"
                ref={tabsRef}
              >
                <button
                  className={`fp-cat-pill ${activeCategory === null ? "fp-cat-pill--active" : ""}`}
                  onClick={(e) => {
                    setActiveCategory(null);
                    e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                  }}
                >
                  All
                </button>
                {ALL_FEATURES.map((cat) => (
                  <button
                    key={cat.category}
                    className={`fp-cat-pill ${activeCategory === cat.category ? "fp-cat-pill--active" : ""}`}
                    style={activeCategory === cat.category ? { background: cat.color, color: "#fff", borderColor: cat.color } : {}}
                    onClick={(e) => {
                      setActiveCategory(activeCategory === cat.category ? null : cat.category);
                      e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="fp-body">
              {filteredFeatures.length === 0 ? (
                <div className="fp-empty">
                  <span className="fp-empty-icon">🔍</span>
                  <p>No features found for &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredFeatures.map((cat) => (
                  <div key={cat.category} className="fp-section">
                    <div className="fp-section-header" style={{ borderLeftColor: cat.color }}>
                      <span className="fp-section-title">{cat.category}</span>
                      <span className="fp-section-count" style={{ background: cat.color }}>{cat.features.length}</span>
                    </div>
                    <div className="fp-features-grid">
                      {cat.features.map((feat) => (
                        <div key={feat.name} className="fp-feature-card">
                          <div className="fp-feat-dot" style={{ background: cat.gradient }} />
                          <div className="fp-feat-content">
                            <div className="fp-feat-name">{feat.name}</div>
                            <div className="fp-feat-desc">{feat.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="fp-footer">
              <span>Mabsol Pharma CRM &copy; {new Date().getFullYear()} · Built by Mabsol Team</span>
              <a href="/login" className="btn btn-primary fp-cta">
                Get Started →
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}