/**
 * app/dashboard/stock/expiry-liquidator/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Batch Expiry & Dead-Stock Liquidator — Premium Liquid Glass Dashboard (Responsive + Pagination)
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    FaWarehouse, FaExclamationTriangle, FaHourglassHalf, FaSync,
    FaSearch, FaDownload, FaFilter, FaTimes, FaBoxes, FaTags,
    FaCopy, FaCheck, FaBuilding, FaBullhorn, FaSkullCrossbones,
    FaMapMarkerAlt, FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";

type BatchItem = {
    batchId: string;
    productCode: string;
    productName: string;
    batchNo: string;
    expiryDateStr: string;
    daysLeft: number;
    qty: number;
    unitCost: number;
    unitMRP: number;
    stockCostValue: number;
    stockMRPValue: number;
    category: "expired" | "critical_30" | "warning_90" | "safe_180" | "safe_normal";
    isDeadstock: boolean;
    sales60Days: number;
    topDemandState: { stateName: string; qty: number } | null;
};

type SummaryData = {
    totalBatchesCount: number;
    totalInventoryCostValue: number;
    totalInventoryMRPValue: number;
    expiredLossCostValue: number;
    critical030CostValue: number;
    warning3190CostValue: number;
    deadstockCostValue: number;
};

type HorizonFilter = "all" | "expired" | "critical_30" | "warning_90" | "safe_180" | "deadstock";

function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);
    return isMobile;
}

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

const formatCr = (n: number) => {
    if (!n && n !== 0) return "₹0";
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
    return `₹${formatINR(n)}`;
};

// Export CSV
function exportBatchCSV(batches: BatchItem[]) {
    const rows: string[] = [];
    rows.push(["Product Code", "Product Name", "Batch No", "Expiry Date", "Days Left", "Available Qty", "Unit Cost", "Stock Value (Cost)", "Risk Category", "Deadstock"].join(","));
    batches.forEach(b => {
        rows.push([b.productCode, `"${b.productName}"`, b.batchNo, b.expiryDateStr, String(b.daysLeft), String(b.qty), String(b.unitCost), String(b.stockCostValue), b.category.toUpperCase(), b.isDeadstock ? "YES" : "NO"].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Batch_Expiry_Liquidator_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function AmbientBg() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" style={{ background: "linear-gradient(160deg, #F0F4FF 0%, #EDF0FB 40%, #F5F0FF 70%, #EEF5F0 100%)" }}>
            <div className="absolute -top-48 -left-40 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full opacity-60 blur-[90px] sm:blur-[130px]" style={{ background: "radial-gradient(circle, #C7D2FE, #818CF820)" }} />
            <div className="absolute top-1/4 -right-40 w-[320px] sm:w-[560px] h-[320px] sm:h-[560px] rounded-full opacity-50 blur-[90px] sm:blur-[130px]" style={{ background: "radial-gradient(circle, #D8B4FE, #A78BFA20)" }} />
            <div className="absolute bottom-[-120px] left-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full opacity-45 blur-[100px] sm:blur-[140px]" style={{ background: "radial-gradient(circle, #A7F3D0, #10B98120)" }} />
        </div>
    );
}

function GlassCard({ children, className = "", title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) {
    return (
        <div className={`relative rounded-[16px] sm:rounded-[22px] overflow-hidden ${className}`}
            style={{
                background: "rgba(255,255,255,0.68)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.06), 0 1px 0 rgba(255,255,255,0.9) inset",
            }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            {(title || subtitle) && (
                <div className="px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-0">
                    {title && <h3 className="text-xs sm:text-[14px] font-black text-slate-800 tracking-tight m-0">{title}</h3>}
                    {subtitle && <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 m-0 font-medium">{subtitle}</p>}
                </div>
            )}
            <div className="p-3.5 sm:p-5">{children}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BatchExpiryLiquidatorPage() {
    const { selectedCompany } = useCompany();
    const isMobile = useIsMobile(640);

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSchemeBatch, setSelectedSchemeBatch] = useState<BatchItem | null>(null);
    const [copiedToast, setCopiedToast] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const companyIdStr = selectedCompany?._id || "";

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            if (companyIdStr) params.set("companyId", companyIdStr);

            const res = await fetch(`/api/dashboard/stock/expiry-liquidator?${params}`);
            if (!res.ok) {
                const text = await res.text();
                let errMsg = `Server returned status ${res.status}`;
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.error) errMsg = parsed.error;
                } catch {}
                throw new Error(errMsg);
            }
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to load expiry data");

            setSummary(json.summary);
            setBatches(json.batches || []);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [companyIdStr]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [horizonFilter, searchQuery, pageSize]);

    // Filtered Batches
    const filteredBatches = useMemo(() => {
        return batches.filter(b => {
            // Horizon Filter
            if (horizonFilter === "expired" && b.category !== "expired") return false;
            if (horizonFilter === "critical_30" && b.category !== "critical_30") return false;
            if (horizonFilter === "warning_90" && b.category !== "warning_90") return false;
            if (horizonFilter === "safe_180" && b.category !== "safe_180" && b.category !== "safe_normal") return false;
            if (horizonFilter === "deadstock" && !b.isDeadstock) return false;

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return b.productName.toLowerCase().includes(q) || b.batchNo.toLowerCase().includes(q) || b.productCode.toLowerCase().includes(q);
            }
            return true;
        });
    }, [batches, horizonFilter, searchQuery]);

    // Pagination calculation
    const totalPages = Math.ceil(filteredBatches.length / pageSize) || 1;
    const paginatedBatches = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredBatches.slice(start, start + pageSize);
    }, [filteredBatches, currentPage, pageSize]);

    // Generated AI Clearance Offer Text
    const generatedOfferText = useMemo(() => {
        if (!selectedSchemeBatch) return "";
        const b = selectedSchemeBatch;
        if (b.category === "expired") {
            return `ALERT: Batch ${b.batchNo} of ${b.productName} has expired (${b.expiryDateStr}). As per Drug & Cosmetics Laws, expired batches cannot be sold. Please initiate Return/Credit Note VFP Voucher.`;
        }

        let schemeOffer = "";
        if (b.category === "critical_30") {
            schemeOffer = `⚡ URGENT CLEARANCE SCHEME: Buy 5 Packs of ${b.productName} (Batch: ${b.batchNo}) & Get 2 Packs FREE (40% Extra Margin) + 15% Cash Discount! Special Expiry Clearance Offer valid till stocks last.`;
        } else if (b.category === "warning_90") {
            schemeOffer = `🎁 SPECIAL STOCK CLEARANCE SCHEME: Buy 10 Packs of ${b.productName} (Batch: ${b.batchNo}) & Get 2 Packs FREE (20% Scheme Benefit). Best opportunity to boost stockist margins!`;
        } else if (b.isDeadstock) {
            schemeOffer = `🔥 DEAD-STOCK PROMOTIONAL SCHEME: Special Incentive Scheme on ${b.productName} (Batch: ${b.batchNo}) — Buy 6 Get 1 Free + Extra 5% MR Target Incentive!`;
        } else {
            schemeOffer = `PROMOTIONAL OFFER: ${b.productName} (Batch: ${b.batchNo}) — Standard Commercial Discount 10% on minimum order of 20 packs.`;
        }
        return schemeOffer;
    }, [selectedSchemeBatch]);

    const handleCopyOffer = () => {
        if (!generatedOfferText) return;
        navigator.clipboard.writeText(generatedOfferText);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
    };

    return (
        <div className="min-h-screen p-2.5 sm:p-4 md:p-6 space-y-3.5 sm:space-y-5 relative">
            <AmbientBg />

            {/* Header */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #EF4444, #F59E0B)", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}>
                            <FaWarehouse size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                                Batch Expiry &amp; Dead-Stock Liquidator
                            </h1>
                            <p className="text-[10px] sm:text-[12px] text-slate-500 mt-0.5 m-0">
                                Financial Loss Prevention · Expiry Horizon Tracking · AI Clearance Scheme Generator
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
                        {selectedCompany && (
                            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <FaBuilding size={9} /> {selectedCompany.companyName}
                            </span>
                        )}
                        <button onClick={fetchData} className="p-2 rounded-full bg-white/70 border border-slate-200 text-slate-600 hover:bg-white active:scale-95 transition-all">
                            <FaSync size={11} className={loading ? "animate-spin" : ""} />
                        </button>
                        {batches.length > 0 && (
                            <button onClick={() => exportBatchCSV(filteredBatches)}
                                className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                                <FaDownload size={9} /> Export Batch CSV
                            </button>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* Error */}
            {error && (
                <div className="rounded-[16px] px-4 py-3 flex items-center gap-2 text-rose-600 text-xs font-medium border border-rose-200 bg-rose-50/70">
                    <FaExclamationTriangle size={13} /> {error}
                </div>
            )}

            {/* Financial Loss Risk KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-slate-50/90 to-blue-50/70 border border-slate-200/70 shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 m-0 truncate">Total Stock Valuation</p>
                    <p className="text-sm sm:text-xl font-black text-slate-900 m-0 mt-0.5 truncate">{formatCr(summary?.totalInventoryCostValue || 0)}</p>
                    <p className="text-[9px] text-slate-400 m-0 mt-0.5 truncate">{summary?.totalBatchesCount || batches.length} Active Batches</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-rose-50/90 to-red-100/70 border border-rose-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-600 m-0 truncate">Expired Stock Loss</p>
                        <FaSkullCrossbones size={11} className="text-rose-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-rose-700 m-0 mt-0.5 truncate">{formatCr(summary?.expiredLossCostValue || 0)}</p>
                    <p className="text-[9px] text-rose-500 font-semibold m-0 mt-0.5 truncate">Initiate VFP Credit Return</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-orange-50/90 to-amber-100/70 border border-orange-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-orange-600 m-0 truncate">Critical (0-30 Days)</p>
                        <FaExclamationTriangle size={11} className="text-orange-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-orange-700 m-0 mt-0.5 truncate">{formatCr(summary?.critical030CostValue || 0)}</p>
                    <p className="text-[9px] text-orange-600 font-semibold m-0 mt-0.5 truncate">Immediate Clearance Needed</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-amber-50/90 to-yellow-100/70 border border-amber-200/70 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 m-0 truncate">Warning (31-90 Days)</p>
                        <FaHourglassHalf size={11} className="text-amber-600 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-amber-800 m-0 mt-0.5 truncate">{formatCr(summary?.warning3190CostValue || 0)}</p>
                    <p className="text-[9px] text-amber-700 font-medium m-0 mt-0.5 truncate">Push Stockist Discounts</p>
                </div>

                <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-purple-50/90 to-fuchsia-50/70 border border-purple-200/70 shadow-sm col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-purple-600 m-0 truncate">Deadstock (&gt;60d No Sale)</p>
                        <FaBoxes size={11} className="text-purple-500 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-xl font-black text-purple-800 m-0 mt-0.5 truncate">{formatCr(summary?.deadstockCostValue || 0)}</p>
                    <p className="text-[9px] text-purple-700 font-medium m-0 mt-0.5 truncate">Zero Movement Batches</p>
                </div>
            </div>

            {/* Expiry Horizon Filter Bar */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="text-xs sm:text-[14px] font-black text-slate-800 flex items-center gap-2 m-0">
                            <FaFilter size={12} className="text-indigo-500" />
                            Expiry Risk Horizon &amp; Filter Controls
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 m-0 font-medium">Filter inventory by days until expiration or zero-movement deadstock</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <FaSearch size={11} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search formulation, batch, code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex overflow-x-auto scrollbar-hide pt-2 border-t border-slate-200/60 gap-1.5">
                    {[
                        { key: "all", label: `All Active Batches (${batches.length})`, color: "bg-slate-100 text-slate-700" },
                        { key: "expired", label: "Expired Stock", color: "bg-rose-100 text-rose-800" },
                        { key: "critical_30", label: "Critical (0-30 Days)", color: "bg-orange-100 text-orange-800" },
                        { key: "warning_90", label: "Warning (31-90 Days)", color: "bg-amber-100 text-amber-800" },
                        { key: "safe_180", label: "Safe (90+ Days)", color: "bg-emerald-100 text-emerald-800" },
                        { key: "deadstock", label: "Deadstock (>60d No Sale)", color: "bg-purple-100 text-purple-800" },
                    ].map(opt => {
                        const isActive = horizonFilter === opt.key;
                        return (
                            <button key={opt.key} onClick={() => setHorizonFilter(opt.key as any)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                                    isActive ? "bg-indigo-600 text-white shadow-md" : opt.color
                                }`}>
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </GlassCard>

            {/* Batch Risk Table */}
            <GlassCard title="Batch Risk Management Table" subtitle={`Displaying ${filteredBatches.length} batches matching filter criteria`}>
                <div className="overflow-x-auto mt-2 rounded-xl border border-slate-200/50">
                    <table className="w-full text-xs min-w-[720px]">
                        <thead>
                            <tr className="border-b border-slate-200/60 bg-slate-50/80">
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Formulation &amp; Code</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Batch No</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-semibold">Expiry Date</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Available Qty</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Stock Value</th>
                                <th className="text-center py-2.5 px-3 text-slate-500 font-semibold">Days Left / Status</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-slate-400">
                                        <FaSync size={16} className="animate-spin inline-block mr-2 text-indigo-500" /> Loading batch risk analytics...
                                    </td>
                                </tr>
                            ) : paginatedBatches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-400">
                                        No batch records matching selected filter
                                    </td>
                                </tr>
                            ) : (
                                paginatedBatches.map((b) => {
                                    let badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
                                    let badgeLabel = `${b.daysLeft} Days`;

                                    if (b.category === "expired") {
                                        badgeBg = "bg-rose-100 text-rose-800 border-rose-300 font-black";
                                        badgeLabel = "EXPIRED";
                                    } else if (b.category === "critical_30") {
                                        badgeBg = "bg-orange-100 text-orange-800 border-orange-300 font-black";
                                        badgeLabel = `${b.daysLeft} Days (Critical)`;
                                    } else if (b.category === "warning_90") {
                                        badgeBg = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                                        badgeLabel = `${b.daysLeft} Days (Warning)`;
                                    }

                                    return (
                                        <tr key={b.batchId} className="border-b border-slate-100/60 hover:bg-white/60 transition-colors">
                                            <td className="py-2.5 px-3 font-bold text-slate-800">
                                                <div className="truncate max-w-[220px]">{b.productName}</div>
                                                <div className="text-[9px] text-slate-400 font-mono">{b.productCode}</div>
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-indigo-600 font-bold">{b.batchNo}</td>
                                            <td className="py-2.5 px-3 text-slate-600 font-semibold">{b.expiryDateStr}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-slate-800">{b.qty.toLocaleString("en-IN")} Packs</td>
                                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                                {formatCr(b.stockCostValue)}
                                                <div className="text-[9px] text-slate-400 font-normal">MRP {formatCr(b.stockMRPValue)}</div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${badgeBg}`}>
                                                        {badgeLabel}
                                                    </span>
                                                    {b.isDeadstock && (
                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                                            DEADSTOCK (0 Sales 60d)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {b.topDemandState && (
                                                        <span className="text-[9px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"
                                                              title={`High demand state: ${b.topDemandState.stateName}`}>
                                                            <FaMapMarkerAlt size={8} /> {b.topDemandState.stateName}
                                                        </span>
                                                    )}
                                                    <button onClick={() => setSelectedSchemeBatch(b)}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95">
                                                        <FaTags size={9} /> Scheme
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredBatches.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 mt-3 border-t border-slate-200/60 text-xs">
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                            <span>Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none"
                            >
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="ml-2 font-semibold">
                                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredBatches.length)} - {Math.min(currentPage * pageSize, filteredBatches.length)} of {filteredBatches.length} batches
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/80 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1 text-[11px]"
                            >
                                <FaChevronLeft size={10} /> Prev
                            </button>
                            <span className="px-3 py-1 font-bold text-slate-800 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/80 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1 text-[11px]"
                            >
                                Next <FaChevronRight size={10} />
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>

            {/* ── AI Clearance Scheme Generator Modal ────────────────────── */}
            {selectedSchemeBatch && (
                <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[20px] sm:rounded-[24px] shadow-2xl p-4 sm:p-6 space-y-4 border border-white/80 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                                    <FaTags size={14} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 m-0 truncate">AI Clearance Scheme Generator</h3>
                                    <p className="text-[10px] text-slate-500 m-0 truncate">{selectedSchemeBatch.productName} ({selectedSchemeBatch.batchNo})</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedSchemeBatch(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors shrink-0">
                                <FaTimes size={13} />
                            </button>
                        </div>

                        {/* Batch Summary */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                            <div className="flex justify-between text-slate-600">
                                <span>Expiry Date:</span>
                                <span className="font-bold text-slate-800">{selectedSchemeBatch.expiryDateStr} ({selectedSchemeBatch.daysLeft} Days Left)</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Available Quantity:</span>
                                <span className="font-bold text-slate-800">{selectedSchemeBatch.qty.toLocaleString("en-IN")} Packs</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Total Stock Valuation:</span>
                                <span className="font-bold text-slate-900">{formatCr(selectedSchemeBatch.stockCostValue)}</span>
                            </div>
                        </div>

                        {/* Generated Promotional Offer Circular */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <FaBullhorn className="text-amber-500" /> Recommended Promotional Offer Circular Text:
                            </label>
                            <textarea
                                readOnly
                                value={generatedOfferText}
                                rows={4}
                                className="w-full text-xs p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-slate-800 font-medium focus:outline-none"
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2">
                            {copiedToast ? (
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                    <FaCheck size={12} /> Copied to Clipboard!
                                </span>
                            ) : (
                                <span className="text-[10px] text-slate-400">Share via WhatsApp / Email to MRs &amp; Distributors</span>
                            )}
                            <button onClick={handleCopyOffer}
                                className="flex items-center gap-1.5 text-xs font-black text-white px-4 py-2 rounded-xl transition-all active:scale-95 shadow-md"
                                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                                <FaCopy size={12} /> Copy Promotional Offer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
