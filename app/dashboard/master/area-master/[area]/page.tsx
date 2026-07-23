"use client";

// NOTE: Put this file at: src/app/dashboard/area/full/[area]/page.tsx
// Reads from: /api/master/area/[area]  (see the [area]/route.ts)
// This is what the "View" button on the Area Master list opens.
// Visual language matches area/full/page.tsx — liquid glass (backdrop-blur,
// white/60 translucent cards, #343872 -> indigo gradient header).

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    FaArrowLeft,
    FaMapMarkerAlt,
    FaSearch,
    FaUsers,
    FaWallet,
    FaCoins,
    FaPiggyBank,
    FaFileInvoiceDollar,
    FaPhoneAlt,
} from "react-icons/fa";

interface PartyRow {
    name: string;
    city: string | null;
    district: string | null;
    districtSource: "address" | "city" | null;
    pincode: string | null;
    state: string | null;
    gstno: string | null;
    phone: string | null;
    balance: number;
    isBuyer: boolean;
    isSupplier: boolean;
    totalSales: number;
    saleCount: number;
    lastSaleDate: any;
    totalPurchase: number;
    purchaseCount: number;
    lastPurchaseDate: any;
    ledgerBalance: number;
    ordno: string;
}

interface AreaDetailResponse {
    area: string;
    summary: {
        totalCustomers: number;
        totalOutstanding: number;
        totalCreditBal: number;
        totalSales: number;
        totalPurchase: number;
        gstCount: number;
        phoneCount: number;
    } | null;
    parties: PartyRow[];
}

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const fmtDate = (v: any) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function balanceClasses(balance: number) {
    if (balance > 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance < 0) return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
    return "bg-slate-500/15 text-slate-600 ring-slate-500/30";
}

/* ---------------------------------------------------------- */
/* Glass stat chip — same visual language as Area Master list  */
/* ---------------------------------------------------------- */

function StatChip({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    tone: string;
}) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 px-3.5 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <div className={`flex items-center justify-center h-7 w-7 rounded-lg text-white ${tone}`}>{icon}</div>
            <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-700 tabular-nums">{value}</span>
            </div>
        </div>
    );
}

export default function AreaDetailPage() {
    const params = useParams<{ area: string }>();
    // useParams() already returns the DECODED value on the client — do not
    // decodeURIComponent() again here or "%" in area names would corrupt it.
    const areaName = (params.area || "").toString();

    const [data, setData] = useState<AreaDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!areaName) return;
        setLoading(true);
        setError(null);
        fetch(`/api/master/area/${encodeURIComponent(areaName)}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                return res.json();
            })
            .then((json) => setData(json))
            .catch((err) => setError(err.message || "Failed to load area details"))
            .finally(() => setLoading(false));
    }, [areaName]);

    const filteredParties = useMemo(() => {
        const s = search.trim().toUpperCase();
        return (data?.parties || []).filter((p) => {
            if (!s) return true;
            return [p.name, p.city, p.district, p.pincode, p.state, p.gstno, p.phone]
                .filter(Boolean)
                .some((v) => String(v).toUpperCase().includes(s));
        });
    }, [data, search]);

    return (
        <div className="min-h-screen w-full space-y-4 p-6">
            {/* ==================== BACK LINK ==================== */}
            <Link
                href="/dashboard/master/area-master/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#343872] transition-colors"
            >
                <FaArrowLeft size={11} /> Back to Area Master
            </Link>

            {/* ==================== STAT STRIP ==================== */}
            {data?.summary && (
                <div className="flex flex-wrap gap-2">
                    <StatChip
                        icon={<FaUsers size={12} />}
                        label="Customers"
                        value={data.summary.totalCustomers.toLocaleString("en-IN")}
                        tone="bg-blue-500"
                    />
                    <StatChip
                        icon={<FaWallet size={12} />}
                        label="Outstanding (Dr)"
                        value={money(data.summary.totalOutstanding)}
                        tone="bg-rose-500"
                    />
                    <StatChip
                        icon={<FaPiggyBank size={12} />}
                        label="Advance (Cr)"
                        value={money(data.summary.totalCreditBal)}
                        tone="bg-emerald-500"
                    />
                    <StatChip
                        icon={<FaCoins size={12} />}
                        label="Total Sales"
                        value={money(data.summary.totalSales)}
                        tone="bg-indigo-500"
                    />
                    <StatChip
                        icon={<FaFileInvoiceDollar size={12} />}
                        label="Total Purchase"
                        value={money(data.summary.totalPurchase)}
                        tone="bg-violet-500"
                    />
                    <StatChip
                        icon={<FaFileInvoiceDollar size={12} />}
                        label="With GST"
                        value={data.summary.gstCount}
                        tone="bg-amber-500"
                    />
                    <StatChip
                        icon={<FaPhoneAlt size={12} />}
                        label="With Phone"
                        value={data.summary.phoneCount}
                        tone="bg-teal-500"
                    />
                </div>
            )}

            {/* ==================== MAIN CARD ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* header */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                            <FaMapMarkerAlt size={14} />
                        </div>
                        <div>
                            <h5 className="text-sm font-semibold text-white tracking-wide m-0">{areaName || "—"}</h5>
                            <p className="text-[11px] text-white/70 m-0">Every real party in this area</p>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, city, district, pincode, GST, phone…"
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                        />
                    </div>
                </div>

                {/* results count strip */}
                <div className="relative flex items-center justify-between px-4 py-2 bg-white/40 border-b border-gray-200/60">
                    <span className="text-xs text-gray-500">
                        {filteredParties.length.toLocaleString("en-IN")} {filteredParties.length === 1 ? "party" : "parties"} found
                    </span>
                </div>

                {/* table body */}
                <div className="relative overflow-x-auto">
                    {error ? (
                        <p className="p-6 text-sm text-red-600">Couldn't load area details: {error}</p>
                    ) : (
                        <table className="w-full min-w-[1100px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-200/70 bg-white/30">
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Party</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">City</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">District</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Pincode</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">State</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">GSTIN</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Phone</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Type</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">Balance</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">Sales</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">Purchase</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Last Sale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={12} className="text-center text-gray-400 py-10 text-sm">
                                            Loading…
                                        </td>
                                    </tr>
                                ) : filteredParties.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="text-center text-gray-400 py-10 text-sm">
                                            No parties in this area match your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredParties.map((p, i) => (
                                        <tr
                                            key={`${p.ordno}-${i}`}
                                            className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                        >
                                            <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-800">{p.name || "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{p.city || "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                                                {p.district || "—"}
                                                {p.district && p.districtSource === "city" && (
                                                    <span
                                                        title="Guessed from City — no explicit district text found in the address"
                                                        className="text-[10px] text-amber-500 font-semibold"
                                                    >
                                                        {" "}
                                                        ~
                                                    </span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 tabular-nums">{p.pincode || "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{p.state || "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-500">{p.gstno || "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 tabular-nums">{p.phone || "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5">
                                                <div className="flex gap-1">
                                                    {p.isBuyer && (
                                                        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-500/30">
                                                            Buyer
                                                        </span>
                                                    )}
                                                    {p.isSupplier && (
                                                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-500/30">
                                                            Supplier
                                                        </span>
                                                    )}
                                                    {!p.isBuyer && !p.isSupplier && <span className="text-xs text-gray-300">—</span>}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                                <span
                                                    className={`inline-flex items-center justify-center min-w-[5rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${balanceClasses(
                                                        p.balance
                                                    )}`}
                                                >
                                                    {money(p.balance)}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-gray-600 tabular-nums">{money(p.totalSales)}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-gray-600 tabular-nums">{money(p.totalPurchase)}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{fmtDate(p.lastSaleDate)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <p className="px-1 text-xs text-gray-400">
                District & Pincode are parsed from the party's address lines and may fall back to City ("~") when no
                explicit district text is present in the address.
            </p>
        </div>
    );
}