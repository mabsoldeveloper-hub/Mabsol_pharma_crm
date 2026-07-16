"use client";

import { ReactNode } from "react";
import {
    FaInfoCircle,
    FaRupeeSign,
    FaFileInvoiceDollar,
    FaWarehouse,
    FaTags,
} from "react-icons/fa";

/* ---------------------------------------------------------- */
/* Helpers                                                     */
/* ---------------------------------------------------------- */

const show = (value: any) => {
    if (value === null || value === undefined || value === "") return "-";
    return value;
};

const money = (value: any) =>
    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

type Tone = "indigo" | "emerald" | "amber" | "cyan" | "rose";

const toneStyles: Record<Tone, { gradient: string; icon: string }> = {
    indigo: { gradient: "from-indigo-500/85 to-blue-500/85", icon: "bg-white/25" },
    emerald: { gradient: "from-emerald-500/85 to-green-500/85", icon: "bg-white/25" },
    amber: { gradient: "from-amber-400/90 to-orange-400/90", icon: "bg-white/25" },
    cyan: { gradient: "from-cyan-500/85 to-sky-500/85", icon: "bg-white/25" },
    rose: { gradient: "from-rose-500/85 to-red-500/85", icon: "bg-white/25" },
};

/* ---------------------------------------------------------- */
/* Section shell — glass card with colored gradient header     */
/* ---------------------------------------------------------- */

function Section({
    title,
    tone,
    icon,
    children,
}: {
    title: string;
    tone: Tone;
    icon: ReactNode;
    children: ReactNode;
}) {
    const styles = toneStyles[tone];
    return (
        <div
            className="
        relative rounded-2xl overflow-hidden mt-4
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
        >
            {/* top sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

            {/* header */}
            <div
                className={`relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r ${styles.gradient} backdrop-blur-md`}
            >
                <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${styles.icon} text-white`}>
                    {icon}
                </div>
                <h5 className="text-sm font-semibold text-white tracking-wide m-0">
                    {title}
                </h5>
            </div>

            {/* body */}
            <div className="relative p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
                {children}
            </div>
        </div>
    );
}

/* ---------------------------------------------------------- */
/* Field — one label/value pair                                */
/* ---------------------------------------------------------- */

function Field({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide truncate">
                {label}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-700 truncate">
                {value}
            </p>
        </div>
    );
}

/* ---------------------------------------------------------- */
/* Main component                                               */
/* ---------------------------------------------------------- */

export default function ProductOverview({ product }: any) {
    return (
        <>
            {/* ==================== BASIC INFORMATION ==================== */}
            <Section title="Basic Information" tone="indigo" icon={<FaInfoCircle size={14} />}>
                <Field label="Product Name" value={show(product.PRODUCT)} />
                <Field label="Code" value={show(product.CODE)} />
                <Field label="Company" value={show(product.companyName || product.GCODE)} />
                <Field
                    label="Status"
                    value={
                        product.STATUS == "Y" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30">
                                Inactive
                            </span>
                        )
                    }
                />
                <Field label="Unit" value={show(product.UNIT)} />
                <Field label="Second Unit" value={show(product.UNIT2)} />
                <Field label="Packing" value={show(product.PACKING)} />
                <Field label="Pack Qty" value={show(product.PACK)} />
                <Field label="HSN / SAC" value={show(product.HSN)} />
                <Field label="UPC Code" value={show(product.UPCCODE)} />
                <Field label="Rack No." value={show(product.RACKNO)} />
                <Field label="Rack No. 2" value={show(product.RACKNO2)} />
            </Section>

            {/* ==================== PRICING ==================== */}
            <Section title="Pricing Information" tone="emerald" icon={<FaRupeeSign size={14} />}>
                <Field label="MRP" value={`₹ ${money(product.MRP)}`} />
                <Field label="Purchase Rate" value={`₹ ${money(product.PRATE)}`} />
                <Field label="Sale Rate" value={`₹ ${money(product.RATEF)}`} />
                <Field label="Last Purchase Rate" value={`₹ ${money(product.LPRATE)}`} />
                <Field label="Cost / PCS" value={`₹ ${money(product.COST)}`} />
                <Field label="Rate A" value={`₹ ${money(product.RATEA)}`} />
                <Field label="Rate B" value={`₹ ${money(product.RATEB)}`} />
                <Field label="Rate C" value={`₹ ${money(product.RATEC)}`} />
                <Field label="Rate D" value={`₹ ${money(product.RATED)}`} />
                <Field label="Rate E" value={`₹ ${money(product.RATEE)}`} />
                <Field label="Rate F" value={`₹ ${money(product.RATEF)}`} />
                <Field label="Rate G" value={`₹ ${money(product.RATEG)}`} />
            </Section>

            {/* ==================== GST / TAX ==================== */}
            <Section title="GST / Tax Information" tone="amber" icon={<FaFileInvoiceDollar size={14} />}>
                <Field label="CGST" value={`${show(product.CGST)} %`} />
                <Field label="SGST" value={`${show(product.CGST)} %`} />
                <Field label="IGST" value={`${show(product.IGST)} %`} />
                <Field label="Purchase Tax" value={`${show(product.PURTAX)} %`} />
                <Field label="Sale Tax" value={`${show(product.SALTAX)} %`} />
                <Field label="Tax Type" value={show(product.TAXL)} />
                <Field label="Tax Category" value={show(product.TAXC)} />
            </Section>

            {/* ==================== STOCK INFORMATION ==================== */}
            <Section title="Stock Information" tone="cyan" icon={<FaWarehouse size={14} />}>
                <Field label="Current Stock" value={show(product.BALANCE)} />
                <Field label="Opening Stock" value={show(product.OPENING)} />
                <Field label="On Qty" value={show(product.ONQTY)} />
                <Field label="Free Qty" value={show(product.ONQTYFREE)} />
                <Field label="Free Balance" value={show(product.FREEBAL)} />
                <Field label="Hold Stock" value={show(product.HOLD)} />
                <Field label="Minimum Stock" value={show(product.MINIMUM)} />
                <Field label="Maximum Stock" value={show(product.MAXIMUM)} />
                <Field label="Total Qty" value={show(product.TQTY)} />
                <Field label="Qty" value={show(product.QTY)} />
            </Section>

            {/* ==================== DISCOUNT & SCHEME ==================== */}
            <Section title="Discount & Scheme" tone="rose" icon={<FaTags size={14} />}>
                <Field label="Sale Discount" value={`${show(product.SALDIS)} %`} />
                <Field label="Purchase Discount" value={`${show(product.PURDIS)} %`} />
                <Field label="Sale Special Discount" value={`${show(product.SALVDIS)} %`} />
                <Field label="Purchase Special Discount" value={`${show(product.PURSPDIS)} %`} />
                <Field label="Purchase V. Discount" value={`${show(product.PURSPVDIS)} %`} />
                <Field label="Purchase V. Discount 2" value={`${show(product.PURSPVDIS1)} %`} />
                <Field label="Sale V. Discount" value={`${show(product.SALVDIS)} %`} />
                <Field label="Sale V. Discount 2" value={`${show(product.SALVDIS1)} %`} />
                <Field label="Fixed Discount" value={show(product.FIXDIS)} />
                <Field label="Fixed Discount 2" value={show(product.FIXDIS1)} />
                <Field label="Free Scheme" value={show(product.FREE)} />
                <Field label="Quarter Scheme" value={show(product.QTRSCHE)} />
                <Field label="Half Scheme" value={show(product.HALFSCHE)} />
            </Section>
        </>
    );
}