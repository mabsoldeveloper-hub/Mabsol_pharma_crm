"use client";

// NOTE: Put this file at: src/app/dashboard/area/full/[area]/page.tsx
// Reads from: /api/master/area/[area]  (see the [area]/route.ts above)
// This is what the "View" button on the Area Master list opens.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaMapMarkerAlt, FaSearch } from "react-icons/fa";

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

export default function AreaDetailPage() {
    const params = useParams<{ area: string }>();
    // FIX: useParams() already returns the DECODED value on the client.
    // Calling decodeURIComponent() again here could corrupt area names
    // containing "%" and would also send a mismatched value to the API.
    const areaName = (params.area || "").toString();

    const [data, setData] = useState<AreaDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!areaName) return;
        setLoading(true);
        setError(null);
        // Re-encode exactly once here, when building the URL — this is the
        // only place encoding should happen on the client side.
        fetch(`/api/master/area/${encodeURIComponent(areaName)}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                return res.json();
            })
            .then((json) => setData(json))
            .catch((err) => setError(err.message || "Failed to load area details"))
            .finally(() => setLoading(false));
    }, [areaName]);

    // ...rest of the component stays exactly the same as before
    const s = search.trim().toUpperCase();
    const filteredParties = (data?.parties || []).filter((p) => {
        if (!s) return true;
        return [p.name, p.city, p.district, p.pincode, p.state, p.gstno, p.phone]
            .filter(Boolean)
            .some((v) => String(v).toUpperCase().includes(s));
    });

    return (
        <div className="min-h-screen w-full bg-gray-50 p-6 text-gray-900">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: "#343872" }}>
                        <FaMapMarkerAlt size={16} />
                        {areaName}
                    </h1>
                    <p className="text-sm text-gray-500">
                        Every real party in this area — from the Area Master rollup
                    </p>
                </div>

            </header>

            {/* ---------------- Summary chips ---------------- */}
            {data?.summary && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
                        <span className="text-gray-400 text-xs block">Customers</span>
                        <span className="font-semibold">{data.summary.totalCustomers.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
                        <span className="text-gray-400 text-xs block">Outstanding (Dr)</span>
                        <span className="font-semibold text-rose-600">{money(data.summary.totalOutstanding)}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
                        <span className="text-gray-400 text-xs block">Advance (Cr)</span>
                        <span className="font-semibold text-emerald-700">{money(data.summary.totalCreditBal)}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
                        <span className="text-gray-400 text-xs block">Total Sales</span>
                        <span className="font-semibold">{money(data.summary.totalSales)}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
                        <span className="text-gray-400 text-xs block">Total Purchase</span>
                        <span className="font-semibold">{money(data.summary.totalPurchase)}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
                        <span className="text-gray-400 text-xs block">With GST</span>
                        <span className="font-semibold">{data.summary.gstCount}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
                        <span className="text-gray-400 text-xs block">With Phone</span>
                        <span className="font-semibold">{data.summary.phoneCount}</span>
                    </div>
                </div>
            )}

            {/* ---------------- Search ---------------- */}
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="relative w-full max-w-sm">
                    <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, city, district, pincode, GST, phone…"
                        className="w-full pl-8 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:border-[#343872] focus:outline-none"
                    />
                </div>
                <span className="ml-auto text-sm text-gray-500">
                    {filteredParties.length.toLocaleString("en-IN")} {filteredParties.length === 1 ? "party" : "parties"}
                </span>
            </div>

            {/* ---------------- Table ---------------- */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                {error ? (
                    <p className="p-6 text-sm text-red-600">Couldn't load area details: {error}</p>
                ) : (
                    <table className="w-full min-w-[1100px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="px-4 py-3">Party</th>
                                <th className="px-4 py-3">City</th>
                                <th className="px-4 py-3">District</th>
                                <th className="px-4 py-3">Pincode</th>
                                <th className="px-4 py-3">State</th>
                                <th className="px-4 py-3">GSTIN</th>
                                <th className="px-4 py-3">Phone</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 text-right">Balance</th>
                                <th className="px-4 py-3 text-right">Sales</th>
                                <th className="px-4 py-3 text-right">Purchase</th>
                                <th className="px-4 py-3">Last Sale</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                            ) : filteredParties.length === 0 ? (
                                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">No parties in this area match your search.</td></tr>
                            ) : (
                                filteredParties.map((p, i) => (
                                    <tr key={`${p.ordno}-${i}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{p.name || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.city || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {p.district || "—"}
                                            {p.district && p.districtSource === "city" && (
                                                <span title="Guessed from City — no explicit district text found in the address"> ~</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{p.pincode || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.state || "—"}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.gstno || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.phone || "—"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {p.isBuyer && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Buyer</span>}
                                                {p.isSupplier && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Supplier</span>}
                                                {!p.isBuyer && !p.isSupplier && <span className="text-xs text-gray-300">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold" style={{ color: p.balance < 0 ? "#16a34a" : p.balance > 0 ? "#dc2626" : "#6b7280" }}>
                                            {money(p.balance)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">{money(p.totalSales)}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{money(p.totalPurchase)}</td>
                                        <td className="px-4 py-3 text-gray-500">{fmtDate(p.lastSaleDate)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}