import dbConnect from "@/lib/mongodb";
import Mdis from "@/models/SalesMdis";
import Dis from "@/models/SalesDis";
import Order from "@/models/Order";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import Company from "@/models/Company";

/**
 * ============================================================================
 * GSTR-1 REPORT SERVICE
 * ============================================================================
 * Builds the official GST Portal GSTR-1 JSON structure (b2b / b2cl / b2cs /
 * hsn / doc_issue) from the migrated VFP collections: MDIS (invoice header),
 * DIS (invoice lines), ORDER (party master), PRO (product master),
 * SALETYPE (used only as a temporary HSN fallback — see HSN NOTE below).
 *
 * ---------------------------------------------------------------------------
 * OPEN ITEMS — confirm before going live with real filings:
 * ---------------------------------------------------------------------------
 * 1. HSN CODE: PRO has no dedicated HSN field in the synced data. This file
 *    currently reads `product.IMSCODE` as the HSN code (common VFP pharma
 *    convention: IMSCODE = "Item Master Sub-Code" often reused for HSN/SAC).
 *    CONFIRM this against your actual PRO data — if IMSCODE isn't HSN, tell
 *    me the right field (or say there isn't one, so we can add a proper HSN
 *    master collection instead of guessing).
 *
 * 2. STATE CODE FOR UNREGISTERED PARTIES: registered customers get state
 *    code from their own GSTIN (first 2 digits) — that part is solid. For
 *    UNREGISTERED customers (no GSTNO) we have no reliable state field on
 *    ORDER. `deriveUnregisteredStateCode()` below is a placeholder that
 *    tries MDIS.MISC1 (per earlier confirmed pattern) but I don't have
 *    sample MISC1 values to confirm the exact parse. Send me 5-10 real
 *    MISC1 values (with their known state) and I'll fix this function
 *    precisely — until then it falls back to the company's own state,
 *    which under-counts B2CL and is flagged in the output via `stateGuessed`.
 *
 * 3. IGST: not a stored field anywhere. Derived as
 *    max(0, header.TAXAMO - cgstAmount - sgstAmount) same heuristic as the
 *    existing GST Register report.
 * ============================================================================
 */

// Official 2-digit GST state/UT codes (for validation + PDF/Excel display)
export const GST_STATE_CODES: Record<string, string> = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
    "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
    "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
    "24": "Gujarat", "25": "Daman and Diu", "26": "Dadra and Nagar Haveli",
    "27": "Maharashtra", "28": "Andhra Pradesh (Old)", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
    "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
};

const B2CL_THRESHOLD = 250000; // ₹2.5 Lakh — interstate unregistered threshold

export interface Gstr1Filter {
    month: number; // 1-12
    year: number;  // e.g. 2026
    companyId?: string;
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function ddmmyyyy(dateStr: string) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Registered party -> state code from their own GSTIN (reliable). */
function stateCodeFromGstin(gstin?: string | null): string | null {
    if (!gstin || gstin.length < 2) return null;
    return gstin.slice(0, 2);
}

/**
 * PLACEHOLDER — see OPEN ITEM #2 above. Needs real MISC1 samples to finish.
 * Currently: no reliable derivation for unregistered parties, so this
 * returns null (caller falls back to company's own state and flags it).
 */
function deriveUnregisteredStateCode(mdisRow: any): string | null {
    // TODO: confirm exact MISC1 format from real data, e.g.:
    // if (mdisRow?.MISC1) { const m = /(\d{2})/.exec(mdisRow.MISC1); if (m) return m[1]; }
    return null;
}

type Bucket = "B2B" | "B2CL" | "B2CS";

function classifyInvoice(opts: {
    order: any;
    mdisRow: any;
    invoiceValue: number;
    companyStateCode: string;
}): { bucket: Bucket; custStateCode: string; interstate: boolean; stateGuessed: boolean } {
    const { order, mdisRow, invoiceValue, companyStateCode } = opts;
    const registered = !!order?.GSTNO;

    let custStateCode: string | null = null;
    let stateGuessed = false;

    if (registered) {
        custStateCode = stateCodeFromGstin(order.GSTNO);
    }
    if (!custStateCode) {
        custStateCode = deriveUnregisteredStateCode(mdisRow);
    }
    if (!custStateCode) {
        custStateCode = companyStateCode; // last-resort fallback
        stateGuessed = true;
    }

    const interstate = custStateCode !== companyStateCode;

    let bucket: Bucket;
    if (registered) {
        bucket = "B2B";
    } else if (interstate && invoiceValue > B2CL_THRESHOLD) {
        bucket = "B2CL";
    } else {
        bucket = "B2CS";
    }

    return { bucket, custStateCode, interstate, stateGuessed };
}

const OFFICIAL_GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28];

/** Snaps a computed/stored rate to the nearest official GST slab (portal rejects any other value). */
function snapToGstSlab(rate: number): number {
    if (!rate || rate <= 0) return 0;
    let closest = OFFICIAL_GST_SLABS[0];
    let minDiff = Math.abs(rate - closest);
    for (const slab of OFFICIAL_GST_SLABS) {
        const diff = Math.abs(rate - slab);
        if (diff < minDiff) {
            minDiff = diff;
            closest = slab;
        }
    }
    return closest;
}

/**
 * Reads the line's STORED rate (DIS.CGST is a rate%, matching PRO.CGST
 * convention) instead of back-calculating from amounts. Total rate for
 * intra-state = CGST + SGST (SGST always mirrors CGST in Indian GST), for
 * interstate = DIS.TAX if present, else CGST*2 as a reasonable fallback.
 */
function lineRate(l: any, interstate: boolean): number {
    if (interstate) return l.TAX || (l.CGST || 0) * 2;
    return (l.CGST || 0) * 2;
}

export default class Gstr1Report {
    /**
     * Builds the full GSTR-1 payload for one filing period (calendar month).
     * Returns both the official govt JSON shape (`gstJson`) and a flat
     * `meta` object with counts/flags useful for the UI and for Excel/PDF export.
     */
    static async build(filter: Gstr1Filter) {
        await dbConnect();

        const { month, year, companyId } = filter;
        const mm = pad2(month);
        const dateFrom = `${year}-${mm}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const dateTo = `${year}-${mm}-${pad2(lastDay)}`;

        const company = companyId
            ? await Company.findById(companyId).lean()
            : await Company.findOne({ isDefault: true }).lean() || await Company.findOne().lean();

        if (!company) throw new Error("Company record not found");

        const companyStateCode = stateCodeFromGstin((company as any).gstNo) || "00";

        // ---- Pull all invoices for the period, de-duped by VOUCHER (latest sync wins) ----
        const mdisRows = await (Mdis as any).aggregate([
            { $match: { DATE: { $gte: dateFrom, $lte: dateTo } } },
            { $sort: { _vfpSyncedAt: -1 } },
            { $group: { _id: "$VOUCHER", doc: { $first: "$$ROOT" } } },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { DATE: 1 } },
        ]);

        const vouchers = mdisRows.map((r: any) => r.VOUCHER).filter((v: any) => v != null);
        const codeps = [...new Set(mdisRows.map((r: any) => r.CODEP).filter(Boolean))];

        const [orders, disLines] = await Promise.all([
            codeps.length ? (Order as any).find({ ORDNO: { $in: codeps } }).lean() : [],
            vouchers.length ? (Dis as any).find({ VOUCHER: { $in: vouchers } }).lean() : [],
        ]);

        const orderByCodep = new Map((orders as any[]).map((o) => [o.ORDNO, o]));

        const disByVoucher = new Map<number, any[]>();
        for (const d of disLines as any[]) {
            if (!disByVoucher.has(d.VOUCHER)) disByVoucher.set(d.VOUCHER, []);
            disByVoucher.get(d.VOUCHER)!.push(d);
        }

        // ---- Buckets ----
        const b2bByGstin = new Map<string, any>(); // ctin -> { inv: [] }
        const b2clRows: any[] = [];
        // b2cs is aggregated by (pos, rate) per govt schema — not per-invoice
        const b2csAgg = new Map<string, { sply_ty: string; pos: string; rt: number; txval: number; iamt: number; camt: number; samt: number }>();

        let stateGuessedCount = 0;
        let unclassifiedHsnCount = 0;
        const invoiceDetail: any[] = []; // full per-invoice audit trail for Excel export

        // ---- HSN summary accumulator: hsn_code -> agg ----
        const hsnAgg = new Map<string, {
            desc: string; uqc: string; qty: number; txval: number;
            iamt: number; camt: number; samt: number; rt: number;
        }>();

        for (const row of mdisRows) {
            const order = orderByCodep.get(row.CODEP);
            const lines = disByVoucher.get(row.VOUCHER) || [];

            const taxableAmount = lines.reduce((s, l) => s + (l.AMMMOUNT || 0), 0);
            const cgstAmount = lines.reduce((s, l) => s + (l.CGSTAMO || 0), 0);
            const sgstAmount = lines.reduce((s, l) => s + (l.SSTAAMO || 0), 0);
            const invoiceValue = row.FINAL || row.AMOUNTT || 0;
            const totalTax = row.TAXAMO || 0;
            const igstAmount = Math.max(0, totalTax - cgstAmount - sgstAmount);

            const { bucket, custStateCode, interstate, stateGuessed } = classifyInvoice({
                order, mdisRow: row, invoiceValue, companyStateCode,
            });
            if (stateGuessed) stateGuessedCount++;

            invoiceDetail.push({
                voucher: row.VOUCHER,
                vcn: row.VCN || String(row.VOUCHER),
                date: row.DATE,
                codep: row.CODEP,
                partyName: order?.PARNAM?.trim() || row.CODEP || "-",
                gstin: order?.GSTNO || "-",
                city: order?.CITY || "-",
                bucket,
                placeOfSupply: custStateCode,
                interstate,
                itemCount: lines.length,
                taxableAmount,
                cgstAmount: interstate ? 0 : cgstAmount,
                sgstAmount: interstate ? 0 : sgstAmount,
                igstAmount: interstate ? igstAmount : 0,
                invoiceValue,
                stateGuessed,
            });

            // Per-line rates (lineRt below) are used everywhere now — no single
            // invoice-level "rate" is computed, since that was the source of the
            // B2CS multi-rate bucketing bug fixed above.

            const itms = lines.map((l, idx) => {
                const lineTaxable = l.AMMMOUNT || 0;
                const lineCgst = l.CGSTAMO || 0;
                const lineSgst = l.SSTAAMO || 0;
                // per-line IGST isn't stored — only meaningful when whole invoice is interstate
                const lineIgst = interstate ? Math.max(0, lineTaxable * (l.TAX || (l.CGST || 0) * 2) / 100 - lineCgst - lineSgst) : 0;
                const lineRt = snapToGstSlab(lineRate(l, interstate));
                return {
                    num: idx + 1,
                    itm_det: {
                        rt: lineRt,
                        txval: round2(lineTaxable),
                        iamt: round2(lineIgst),
                        camt: round2(interstate ? 0 : lineCgst),
                        samt: round2(interstate ? 0 : lineSgst),
                        csamt: 0,
                    },
                };
            });

            if (bucket === "B2B") {
                const ctin = order?.GSTNO || "UNKNOWN";
                if (!b2bByGstin.has(ctin)) b2bByGstin.set(ctin, { ctin, inv: [] });
                b2bByGstin.get(ctin).inv.push({
                    inum: row.VCN || String(row.VOUCHER),
                    idt: ddmmyyyy(row.DATE),
                    val: round2(invoiceValue),
                    pos: custStateCode,
                    rchrg: "N",
                    inv_typ: "R",
                    itms,
                });
            } else if (bucket === "B2CL") {
                b2clRows.push({
                    inum: row.VCN || String(row.VOUCHER),
                    idt: ddmmyyyy(row.DATE),
                    val: round2(invoiceValue),
                    pos: custStateCode,
                    itms,
                });
            } else {
                // B2CS — govt schema groups by (place of supply, rate), so aggregate
                // at LINE level, not invoice level. Using one rate for the whole
                // invoice was wrong whenever an invoice mixed products at different
                // GST rates (e.g. one 0%/free line + one 18% line) — it dumped the
                // entire invoice's tax into whichever rate the first line happened
                // to have. Each line now lands in its own correct rate bucket.
                for (const l of lines) {
                    const lineTaxable = l.AMMMOUNT || 0;
                    const lineCgst = l.CGSTAMO || 0;
                    const lineSgst = l.SSTAAMO || 0;
                    const lineIgst = interstate
                        ? Math.max(0, lineTaxable * (l.TAX || (l.CGST || 0) * 2) / 100 - lineCgst - lineSgst)
                        : 0;
                    const lineRt = snapToGstSlab(lineRate(l, interstate));

                    const key = `${custStateCode}|${lineRt}`;
                    if (!b2csAgg.has(key)) {
                        b2csAgg.set(key, {
                            sply_ty: interstate ? "INTER" : "INTRA",
                            pos: custStateCode,
                            rt: lineRt,
                            txval: 0, iamt: 0, camt: 0, samt: 0,
                        });
                    }
                    const agg = b2csAgg.get(key)!;
                    agg.txval += lineTaxable;
                    if (interstate) agg.iamt += lineIgst;
                    else { agg.camt += lineCgst; agg.samt += lineSgst; }
                }
            }

            // ---- HSN accumulation (per DIS line) ----
            for (const l of lines) {
                // NOTE: see OPEN ITEM #1 — using product.IMSCODE as HSN placeholder
                const hsn = l._productHsn || "UNSPECIFIED";
                // hsn set below after product lookup pass — see second pass
            }
        }

        // ---- Second pass for HSN: needs product lookup, done in bulk ----
        const productCodes = [...new Set((disLines as any[]).map((d) => d.CODE).filter((c) => c != null))];
        const products = productCodes.length
            ? await (Product as any).find({ CODE: { $in: productCodes } }).lean()
            : [];
        const productByCode = new Map((products as any[]).map((p) => [p.CODE, p]));

        for (const l of disLines as any[]) {
            const product = productByCode.get(l.CODE);
            // OPEN ITEM #1: IMSCODE confirmed NOT to be a reliable HSN field for
            // most products (mostly blank) — until the real HSN field is
            // confirmed, keep each unresolved product on its OWN row (keyed by
            // product code) instead of merging everything into one "UNSPECIFIED"
            // bucket, which was hiding data and mislabeling totals under one
            // arbitrary product's name.
            const hsn = product?.IMSCODE || `NOHSN-${l.CODE ?? "UNKNOWN"}`;
            if (!product?.IMSCODE) unclassifiedHsnCount++;

            const taxable = l.AMMMOUNT || 0;
            const cgst = l.CGSTAMO || 0;
            const sgst = l.SSTAAMO || 0;
            const rate = snapToGstSlab((l.CGST || 0) * 2);

            if (!hsnAgg.has(hsn)) {
                hsnAgg.set(hsn, {
                    desc: product?.PRODUCT || product?.BILLNAME || "-",
                    uqc: product?.UNIT || "NOS",
                    qty: 0, txval: 0, iamt: 0, camt: 0, samt: 0, rt: rate,
                });
            }
            const agg = hsnAgg.get(hsn)!;
            agg.qty += l.QTY || 0;
            agg.txval += taxable;
            agg.camt += cgst;
            agg.samt += sgst;
        }

        // ---- Documents Issued (invoice number series summary) ----
        const sortedVcns = mdisRows
            .map((r: any) => r.VCN || String(r.VOUCHER))
            .filter(Boolean)
            .sort();
        const docIssue = {
            doc_det: [
                {
                    doc_num: 1,
                    docs: [
                        {
                            num: 1,
                            from: sortedVcns[0] || "-",
                            to: sortedVcns[sortedVcns.length - 1] || "-",
                            totnum: mdisRows.length,
                            cancel: 0, // TODO: no cancellation flag confirmed in MDIS yet
                            net_issue: mdisRows.length,
                        },
                    ],
                },
            ],
        };

        // ---- Assemble official govt JSON ----
        const gstJson = {
            gstin: (company as any).gstNo || "",
            fp: `${mm}${year}`,
            version: "GST3.0",
            b2b: [...b2bByGstin.values()],
            b2cl: b2clRows.length ? [{ inv: b2clRows }] : [],
            b2cs: [...b2csAgg.values()].map((v) => ({
                sply_ty: v.sply_ty, pos: v.pos, typ: "OE",
                rt: v.rt, txval: round2(v.txval), iamt: round2(v.iamt),
                camt: round2(v.camt), samt: round2(v.samt), csamt: 0,
            })),
            hsn: {
                data: [...hsnAgg.entries()].map(([hsn_sc, v], idx) => ({
                    num: idx + 1, hsn_sc, desc: v.desc, uqc: v.uqc,
                    qty: round2(v.qty), val: round2(v.txval + v.camt + v.samt + v.iamt),
                    txval: round2(v.txval), iamt: round2(v.iamt),
                    camt: round2(v.camt), samt: round2(v.samt), csamt: 0, rt: v.rt,
                })),
            },
            doc_issue: docIssue,
        };

        return {
            gstJson,
            invoiceDetail,
            meta: {
                period: `${mm}-${year}`,
                companyName: (company as any).companyName,
                companyGstin: (company as any).gstNo,
                invoiceCount: mdisRows.length,
                b2bCount: [...b2bByGstin.values()].reduce((s, g) => s + g.inv.length, 0),
                b2clCount: b2clRows.length,
                b2csGroupCount: b2csAgg.size,
                hsnLineCount: hsnAgg.size,
                warnings: {
                    stateGuessedCount, // invoices where customer state had to be assumed
                    unclassifiedHsnCount, // DIS lines with no resolvable HSN
                },
            },
        };
    }
}

function round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}