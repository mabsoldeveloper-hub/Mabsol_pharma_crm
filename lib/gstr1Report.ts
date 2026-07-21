import dbConnect from "@/lib/mongodb";
import Mdis from "@/models/SalesMdis";
import Dis from "@/models/SalesDis";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Rate from "@/models/Rate";
import Company from "@/models/Company";

/**
 * ============================================================================
 * GSTR-1 REPORT SERVICE (v2)
 * ============================================================================
 * Builds the official GST Portal GSTR-1 JSON structure from the migrated VFP
 * collections: MDIS (invoice header), DIS (invoice lines), ORDER (party
 * master), PRO (product master), RATE (scheme/discount reference).
 *
 * Sections covered (all portal sections that are structurally meaningful for
 * this business are included, even when the current data has zero rows for
 * them — an empty section still needs to exist so the JSON validates and the
 * UI can show "0 records for this period" instead of hiding the tab):
 *   4A/4B  B2B            registered recipients, invoice-wise
 *   5A     B2CL           unregistered + inter-state + value > 2.5L
 *   7      B2CS           unregistered "small" — aggregated by POS + rate
 *   9B     CDNR           debit/credit notes against REGISTERED recipients
 *   9B     CDNUR          debit/credit notes against UNREGISTERED recipients
 *   6A     EXP            exports — no export flag found in source data,
 *                          kept as an empty structural section (see OPEN ITEMS)
 *   8      NIL/EXEMPT     nil-rated / exempt / non-GST — no such flag found
 *                          in source data either, same treatment as EXP
 *   12     HSN            HSN-wise summary
 *   13     DOC_ISSUE      document number series summary
 *   —      TOTALS         grand total across every section above (not a
 *                          govt JSON field, added for the UI/CA review)
 *
 * ---------------------------------------------------------------------------
 * RESOLVED FROM PREVIOUS OPEN ITEMS
 * ---------------------------------------------------------------------------
 * - Party join: MDIS.CODEP -> ORDER.ORDNO is CONFIRMED correct (98/98 match
 *   on sample data). Left unchanged.
 * - Unregistered customer state: MDIS.MISC1 CONFIRMED format "NN-STATE NAME"
 *   (e.g. "06-HARYANA", "33-TAMIL NADU"). deriveUnregisteredStateCode() now
 *   parses this instead of returning null.
 *
 * ---------------------------------------------------------------------------
 * STILL OPEN — confirm before relying on these for actual filing:
 * ---------------------------------------------------------------------------
 * 1. HSN CODE: still using product.IMSCODE as a placeholder (per earlier
 *    confirmation this is NOT reliable for most products). Every line whose
 *    product has no IMSCODE gets its own `NOHSN-<productCode>` bucket rather
 *    than being merged into one generic row, so at least nothing is silently
 *    hidden. Replace with a real HSN master/field when available.
 * 2. IGST: not a stored field anywhere. Derived as
 *    max(0, header.TAXAMO - cgstAmount - sgstAmount) — same heuristic as
 *    before. Fine for interstate invoices where CGST/SGST are correctly 0,
 *    but double-check a handful of interstate invoices manually before filing.
 * 3. RATE collection (vfp_new_folder_rate): wired in as `schemeRef` — a
 *    REFERENCE-ONLY lookup shown per invoice line in the audit trail. I could
 *    NOT confirm what RATE.CODE / RATE.PCODE actually join to (checked
 *    against PRO.CODE and ORDER.ORDNO/SCODE on sample data — zero overlap,
 *    though the sample RATE export was only 20 rows so this may just be an
 *    unrepresentative slice). It is NOT used anywhere in the tax math. Tell
 *    me what CODE/PCODE/GCODE actually reference and I'll wire it in properly
 *    (e.g. to cross-check DIS.DISC1/DISC2 against the scheme that should have
 *    applied, and flag mismatches).
 * 4. EXPORTS / NIL-RATED: no export flag (e.g. shipping bill no., LUT/bond,
 *    port code) or nil-rated/exempt flag was found in DIS/MDIS/PRO in the
 *    sample data. Sections are included empty. If your business does export
 *    or nil-rated sales, tell me which field marks them.
 * 5. CDNR/CDNUR: classified purely from VCN prefix ("DN" = Debit Note, "CN"
 *    = Credit Note) plus MDIS.TYPE === "B". No linkage to the ORIGINAL
 *    invoice number is stored anywhere I could find (govt schema wants the
 *    original invoice number `inum` referenced by the note) — currently the
 *    note's own VCN is used for both `nt_num` and left `inum` blank. Confirm
 *    if there's a field that stores the original invoice reference on a note.
 * ============================================================================
 */

// Official 2-digit GST state/UT codes
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

function round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Registered party -> state code from their own GSTIN (reliable). */
function stateCodeFromGstin(gstin?: string | null): string | null {
    if (!gstin || gstin.length < 2) return null;
    return gstin.slice(0, 2);
}

/**
 * Unregistered party -> state code from MDIS.MISC1.
 * Confirmed format from synced VFP data: "NN-STATE NAME", e.g. "06-HARYANA",
 * "33-TAMIL NADU", "02-HIMACHAL PRA" (VFP field truncation, doesn't matter —
 * we only read the leading 2-digit code).
 */
function deriveUnregisteredStateCode(mdisRow: any): string | null {
    const raw = mdisRow?.MISC1;
    if (!raw || typeof raw !== "string") return null;
    const m = /^(\d{2})-/.exec(raw.trim());
    if (m && GST_STATE_CODES[m[1]]) return m[1];
    return null;
}

/** "DN..." -> Debit Note, "CN..." -> Credit Note, else not a note. */
function noteTypeFromVcn(vcn?: string | null): "D" | "C" | null {
    if (!vcn) return null;
    const p = vcn.trim().toUpperCase();
    if (p.startsWith("DN")) return "D";
    if (p.startsWith("CN")) return "C";
    return null;
}

type Bucket = "B2B" | "B2CL" | "B2CS" | "CDNR" | "CDNUR";

function classifyParty(opts: {
    order: any;
    mdisRow: any;
    companyStateCode: string;
}): { registered: boolean; custStateCode: string; interstate: boolean; stateGuessed: boolean } {
    const { order, mdisRow, companyStateCode } = opts;
    const registered = !!order?.GSTNO;

    let custStateCode: string | null = null;
    let stateGuessed = false;

    if (registered) custStateCode = stateCodeFromGstin(order.GSTNO);
    if (!custStateCode) custStateCode = deriveUnregisteredStateCode(mdisRow);
    if (!custStateCode) {
        custStateCode = companyStateCode; // last-resort fallback
        stateGuessed = true;
    }

    return { registered, custStateCode, interstate: custStateCode !== companyStateCode, stateGuessed };
}

const OFFICIAL_GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28];

/** Snaps a computed/stored rate to the nearest official GST slab (portal rejects any other value). */
function snapToGstSlab(rate: number): number {
    if (!rate || rate <= 0) return 0;
    let closest = OFFICIAL_GST_SLABS[0];
    let minDiff = Math.abs(rate - closest);
    for (const slab of OFFICIAL_GST_SLABS) {
        const diff = Math.abs(rate - slab);
        if (diff < minDiff) { minDiff = diff; closest = slab; }
    }
    return closest;
}

/** Total rate for intra-state = CGST*2 (SGST mirrors CGST). Interstate uses DIS.TAX if present. */
function lineRate(l: any, interstate: boolean): number {
    if (interstate) return l.TAX || (l.CGST || 0) * 2;
    return (l.CGST || 0) * 2;
}

/** Empty running total, reused for every section and the grand total. */
function emptyTotal() {
    return { count: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, invoiceValue: 0 };
}
function addToTotal(t: ReturnType<typeof emptyTotal>, row: { taxableValue: number; cgst: number; sgst: number; igst: number; cess?: number; invoiceValue: number }) {
    t.count += 1;
    t.taxableValue += row.taxableValue;
    t.cgst += row.cgst;
    t.sgst += row.sgst;
    t.igst += row.igst;
    t.cess += row.cess || 0;
    t.invoiceValue += row.invoiceValue;
}
function round2Total(t: ReturnType<typeof emptyTotal>) {
    return {
        count: t.count,
        taxableValue: round2(t.taxableValue),
        cgst: round2(t.cgst),
        sgst: round2(t.sgst),
        igst: round2(t.igst),
        cess: round2(t.cess),
        invoiceValue: round2(t.invoiceValue),
    };
}

export default class Gstr1Report {
    static async build(filter: Gstr1Filter) {
        await dbConnect();

        const { month, year, companyId } = filter;
        const mm = pad2(month);
        const dateFrom = `${year}-${mm}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const dateTo = `${year}-${mm}-${pad2(lastDay)}`;

        const company = companyId
            ? await Company.findById(companyId).lean()
            : (await Company.findOne({ isDefault: true }).lean()) || (await Company.findOne().lean());

        if (!company) throw new Error("Company record not found");

        const companyStateCode = stateCodeFromGstin((company as any).gstNo) || "00";

        // ---- Pull sales invoices (TYPE='S') and notes (TYPE='B') for the period ----
        const mdisRows = await (Mdis as any).aggregate([
            { $match: { DATE: { $gte: dateFrom, $lte: dateTo }, TYPE: { $in: ["S", "B"] } } },
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

        // ---- Product + RATE lookups (bulk, second pass) ----
        const productCodes = [...new Set((disLines as any[]).map((d) => d.CODE).filter((c) => c != null))];
        const products = productCodes.length ? await (Product as any).find({ CODE: { $in: productCodes } }).lean() : [];
        const productByCode = new Map((products as any[]).map((p) => [p.CODE, p]));

        // Reference-only scheme lookup — see OPEN ITEM #3. Keyed by PCODE since
        // that's the only field on RATE that looks like it could reference a
        // product/group in some form. NOT used in any tax calculation.
        const ratePcodes = [...new Set((disLines as any[]).map((d) => String(d.CODE)))];
        const rateRows = ratePcodes.length ? await (Rate as any).find({ PCODE: { $in: ratePcodes } }).lean() : [];
        const rateByPcode = new Map<string, any[]>();
        for (const r of rateRows as any[]) {
            const key = String(r.PCODE);
            if (!rateByPcode.has(key)) rateByPcode.set(key, []);
            rateByPcode.get(key)!.push(r);
        }
        /** Best-effort: latest RATE row for this product code on/before the invoice date. Reference only. */
        function schemeRefFor(productCode: any, invoiceDate: string): { disc1: number; disc2: number; date: string } | null {
            const rows = rateByPcode.get(String(productCode));
            if (!rows || !rows.length) return null;
            const applicable = rows.filter((r) => !r.DATE || r.DATE <= invoiceDate).sort((a, b) => (b.DATE || "").localeCompare(a.DATE || ""));
            const pick = applicable[0] || rows[0];
            return { disc1: pick.DISC1 || 0, disc2: pick.DISC2 || 0, date: pick.DATE };
        }

        // ---- Buckets ----
        const b2bByGstin = new Map<string, any>();
        const b2clRows: any[] = [];
        const b2csAgg = new Map<string, { sply_ty: string; pos: string; rt: number; txval: number; iamt: number; camt: number; samt: number }>();
        const cdnrByGstin = new Map<string, any>();
        const cdnurRows: any[] = [];

        let stateGuessedCount = 0;
        let unclassifiedHsnCount = 0;
        const invoiceDetail: any[] = [];

        const hsnAgg = new Map<string, { desc: string; uqc: string; qty: number; txval: number; iamt: number; camt: number; samt: number; rt: number }>();

        // Running grand totals, split per section (for the UI totals panel)
        const totals = {
            b2b: emptyTotal(), b2cl: emptyTotal(), b2cs: emptyTotal(),
            cdnr: emptyTotal(), cdnur: emptyTotal(), grand: emptyTotal(),
        };

        for (const row of mdisRows) {
            const order = orderByCodep.get(row.CODEP);
            const lines = disByVoucher.get(row.VOUCHER) || [];

            const taxableAmount = lines.reduce((s, l) => s + (l.AMMMOUNT || 0), 0);
            const cgstAmount = lines.reduce((s, l) => s + (l.CGSTAMO || 0), 0);
            const sgstAmount = lines.reduce((s, l) => s + (l.SSTAAMO || 0), 0);
            const invoiceValue = row.FINAL || row.AMOUNTT || 0;
            const totalTax = row.TAXAMO || 0;

            const { registered, custStateCode, interstate, stateGuessed } = classifyParty({ order, mdisRow: row, companyStateCode });
            if (stateGuessed) stateGuessedCount++;

            const igstAmount = Math.max(0, totalTax - cgstAmount - sgstAmount);
            const noteType = row.TYPE === "B" ? noteTypeFromVcn(row.VCN) : null;
            // Debit notes ADD to liability, credit notes SUBTRACT — govt schema
            // expects the note's own (positive) amounts plus a note_type flag;
            // sign is only applied in our internal grand-total rollup below.
            const sign = noteType === "C" ? -1 : 1;

            let bucket: Bucket;
            if (noteType) {
                bucket = registered ? "CDNR" : "CDNUR";
            } else if (registered) {
                bucket = "B2B";
            } else if (interstate && invoiceValue > B2CL_THRESHOLD) {
                bucket = "B2CL";
            } else {
                bucket = "B2CS";
            }

            invoiceDetail.push({
                voucher: row.VOUCHER,
                vcn: row.VCN || String(row.VOUCHER),
                date: row.DATE,
                docType: noteType === "D" ? "Debit Note" : noteType === "C" ? "Credit Note" : "Invoice",
                codep: row.CODEP,
                partyName: order?.PARNAM?.trim() || row.CODEP || "-",
                gstin: order?.GSTNO || "-",
                city: order?.CITY || "-",
                bucket,
                placeOfSupply: custStateCode,
                placeOfSupplyName: GST_STATE_CODES[custStateCode] || custStateCode,
                interstate,
                itemCount: lines.length,
                taxableAmount,
                cgstAmount: interstate ? 0 : cgstAmount,
                sgstAmount: interstate ? 0 : sgstAmount,
                igstAmount: interstate ? igstAmount : 0,
                invoiceValue,
                stateGuessed,
            });

            const itms = lines.map((l, idx) => {
                const lineTaxable = l.AMMMOUNT || 0;
                const lineCgst = l.CGSTAMO || 0;
                const lineSgst = l.SSTAAMO || 0;
                const lineIgst = interstate ? Math.max(0, (lineTaxable * (l.TAX || (l.CGST || 0) * 2)) / 100 - lineCgst - lineSgst) : 0;
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

            const rowTotal = { taxableValue: taxableAmount, cgst: interstate ? 0 : cgstAmount, sgst: interstate ? 0 : sgstAmount, igst: interstate ? igstAmount : 0, invoiceValue };

            if (bucket === "B2B") {
                const ctin = order?.GSTNO || "UNKNOWN";
                if (!b2bByGstin.has(ctin)) b2bByGstin.set(ctin, { ctin, inv: [] });
                b2bByGstin.get(ctin).inv.push({ inum: row.VCN || String(row.VOUCHER), idt: ddmmyyyy(row.DATE), val: round2(invoiceValue), pos: custStateCode, rchrg: "N", inv_typ: "R", itms });
                addToTotal(totals.b2b, rowTotal);
            } else if (bucket === "B2CL") {
                b2clRows.push({ inum: row.VCN || String(row.VOUCHER), idt: ddmmyyyy(row.DATE), val: round2(invoiceValue), pos: custStateCode, itms });
                addToTotal(totals.b2cl, rowTotal);
            } else if (bucket === "CDNR") {
                const ctin = order?.GSTNO || "UNKNOWN";
                if (!cdnrByGstin.has(ctin)) cdnrByGstin.set(ctin, { ctin, nt: [] });
                cdnrByGstin.get(ctin).nt.push({
                    ntty: noteType, nt_num: row.VCN || String(row.VOUCHER), nt_dt: ddmmyyyy(row.DATE),
                    val: round2(invoiceValue), pos: custStateCode, rchrg: "N", itms,
                });
                addToTotal(totals.cdnr, rowTotal);
            } else if (bucket === "CDNUR") {
                cdnurRows.push({
                    ntty: noteType, nt_num: row.VCN || String(row.VOUCHER), nt_dt: ddmmyyyy(row.DATE),
                    val: round2(invoiceValue), pos: custStateCode, typ: interstate ? "B2CL" : "B2CS", itms,
                });
                addToTotal(totals.cdnur, rowTotal);
            } else {
                // B2CS — govt schema aggregates by (POS, rate), so bucket at LINE level
                for (const l of lines) {
                    const lineTaxable = l.AMMMOUNT || 0;
                    const lineCgst = l.CGSTAMO || 0;
                    const lineSgst = l.SSTAAMO || 0;
                    const lineIgst = interstate ? Math.max(0, (lineTaxable * (l.TAX || (l.CGST || 0) * 2)) / 100 - lineCgst - lineSgst) : 0;
                    const lineRt = snapToGstSlab(lineRate(l, interstate));
                    const key = `${custStateCode}|${lineRt}`;
                    if (!b2csAgg.has(key)) b2csAgg.set(key, { sply_ty: interstate ? "INTER" : "INTRA", pos: custStateCode, rt: lineRt, txval: 0, iamt: 0, camt: 0, samt: 0 });
                    const agg = b2csAgg.get(key)!;
                    agg.txval += lineTaxable;
                    if (interstate) agg.iamt += lineIgst; else { agg.camt += lineCgst; agg.samt += lineSgst; }
                }
                addToTotal(totals.b2cs, rowTotal);
            }

            // Grand total rollup — notes apply with sign (debit note adds, credit note subtracts)
            addToTotal(totals.grand, { taxableValue: rowTotal.taxableValue * sign, cgst: rowTotal.cgst * sign, sgst: rowTotal.sgst * sign, igst: rowTotal.igst * sign, invoiceValue: rowTotal.invoiceValue * sign });

            // ---- HSN accumulation (skip notes to avoid double counting outward supply value; include if you want notes reflected) ----
            if (!noteType) {
                for (const l of lines) {
                    const product = productByCode.get(l.CODE);
                    const hsn = product?.IMSCODE || `NOHSN-${l.CODE ?? "UNKNOWN"}`;
                    if (!product?.IMSCODE) unclassifiedHsnCount++;

                    const taxable = l.AMMMOUNT || 0;
                    const cgst = l.CGSTAMO || 0;
                    const sgst = l.SSTAAMO || 0;
                    const rate = snapToGstSlab((l.CGST || 0) * 2);

                    if (!hsnAgg.has(hsn)) hsnAgg.set(hsn, { desc: product?.PRODUCT || product?.BILLNAME || "-", uqc: product?.UNIT || "NOS", qty: 0, txval: 0, iamt: 0, camt: 0, samt: 0, rt: rate });
                    const agg = hsnAgg.get(hsn)!;
                    agg.qty += l.QTY || 0;
                    agg.txval += taxable;
                    agg.camt += cgst;
                    agg.samt += sgst;
                }
            }
        }

        // ---- Documents Issued ----
        const salesVcns = mdisRows.filter((r: any) => r.TYPE === "S").map((r: any) => r.VCN || String(r.VOUCHER)).filter(Boolean).sort();
        const noteVcns = mdisRows.filter((r: any) => r.TYPE === "B").map((r: any) => r.VCN || String(r.VOUCHER)).filter(Boolean).sort();
        const docIssue = {
            doc_det: [
                { doc_num: 1, docs: [{ num: 1, from: salesVcns[0] || "-", to: salesVcns[salesVcns.length - 1] || "-", totnum: salesVcns.length, cancel: 0, net_issue: salesVcns.length }] },
                { doc_num: 2, docs: [{ num: 2, from: noteVcns[0] || "-", to: noteVcns[noteVcns.length - 1] || "-", totnum: noteVcns.length, cancel: 0, net_issue: noteVcns.length }] },
            ],
        };

        const gstJson = {
            gstin: (company as any).gstNo || "",
            fp: `${mm}${year}`,
            version: "GST3.0",
            b2b: [...b2bByGstin.values()],
            b2cl: b2clRows.length ? [{ inv: b2clRows }] : [],
            b2cs: [...b2csAgg.values()].map((v) => ({ sply_ty: v.sply_ty, pos: v.pos, typ: "OE", rt: v.rt, txval: round2(v.txval), iamt: round2(v.iamt), camt: round2(v.camt), samt: round2(v.samt), csamt: 0 })),
            cdnr: [...cdnrByGstin.values()],
            cdnur: cdnurRows,
            exp: [], // no export marker found in source data — see OPEN ITEM #4
            nil: { inv: [] }, // no nil-rated/exempt marker found — see OPEN ITEM #4
            hsn: {
                data: [...hsnAgg.entries()].map(([hsn_sc, v], idx) => ({
                    num: idx + 1, hsn_sc, desc: v.desc, uqc: v.uqc, qty: round2(v.qty),
                    val: round2(v.txval + v.camt + v.samt + v.iamt), txval: round2(v.txval),
                    iamt: round2(v.iamt), camt: round2(v.camt), samt: round2(v.samt), csamt: 0, rt: v.rt,
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
                companyStateCode,
                invoiceCount: mdisRows.length,
                b2bCount: [...b2bByGstin.values()].reduce((s, g) => s + g.inv.length, 0),
                b2clCount: b2clRows.length,
                b2csGroupCount: b2csAgg.size,
                cdnrCount: [...cdnrByGstin.values()].reduce((s, g) => s + g.nt.length, 0),
                cdnurCount: cdnurRows.length,
                hsnLineCount: hsnAgg.size,
                docsIssuedCount: salesVcns.length + noteVcns.length,
                totals: {
                    b2b: round2Total(totals.b2b),
                    b2cl: round2Total(totals.b2cl),
                    b2cs: round2Total(totals.b2cs),
                    cdnr: round2Total(totals.cdnr),
                    cdnur: round2Total(totals.cdnur),
                    grand: round2Total(totals.grand),
                },
                warnings: {
                    stateGuessedCount,
                    unclassifiedHsnCount,
                    noExportDataFound: true,
                    noNilRatedDataFound: true,
                },
            },
        };
    }
}