import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Pend from "@/models/Pend";
import GlLedger from "@/models/GlLedger";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import { buildFYDateQuery } from "@/lib/financialYearHelper";
import { combineFilters } from "@/lib/companyVfpHelper";

export interface OutstandingReportFilter {
    // customer-level (Order)
    search?: string;
    customerCode?: string;
    city?: string;
    status?: string;

    // geo/team — checked across Pend, Order, GlLedger, MDIS, DIS
    area?: string;
    route?: string;
    dsm?: string;
    asm?: string;
    rsm?: string;

    // Pend-level
    type?: string;
    mr?: string;
    voucher?: string;
    vcn?: string;
    dueFrom?: string;
    dueTo?: string;
    minAmount?: string | number;
    maxAmount?: string | number;
    onlyOutstanding?: string; // "Y" | "N" -> default "Y" (FINAL != 0)

    // GlLedger-level
    book?: string; // BOOK
    cd?: string; // CD: C/D
    ledgerCode?: string; // CODE

    // invoice-level (SalesMdis)
    godown?: string;
    transport?: string;
    form?: string;
    challan?: string;
    account?: string; // ACCOUNT: Y/N

    // item/batch-level (SalesDis)
    batch?: string;
    company?: string;

    companyId?: string;
    companyVfpMatch?: Record<string, any>;

    page?: number;
    limit?: number;

    sortField?: string;
    sortOrder?: 1 | -1;
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PEND_SORTABLE_FIELDS = new Set([
    "DDATE",
    "FINAL",
    "ORD",
    "DUEDAYS",
    "VOUCHER",
    "TYPE",
]);

/**
 * Outstanding Report — full 5-table version
 *
 * Primary table: Pend (each row = one outstanding voucher, FINAL = amount).
 *
 * Joined with:
 *   - Order     -> customer display info (PARNAM, CITY, STATUS, PHONE, GSTNO, DLNO...)
 *   - GlLedger  -> DSM/AREA/ROUT/ASM/RSM fallback + ledger-level fields (BOOK, CD, CODE)
 *   - SalesMdis -> the originating sale invoice
 *   - SalesDis  -> line items / batches for that invoice, linked via SalesDis.VOUCHER == SalesMdis.VOUCHER
 *
 * IMPORTANT FIX: Pend -> SalesMdis linking is NOT reliably a single field across all
 * TYPEs of Pend rows in the migrated VFP data. Some rows link via SVOUCHER, others via
 * VOUCHER. So instead of hardcoding one field, we now try BOTH (`invoiceVoucherFields`,
 * in priority order) and use whichever one actually resolves to a real SalesMdis record.
 * This is the fix for "MDIS/DIS data not showing up" — previously only SVOUCHER was
 * ever checked, silently dropping invoices that only matched via VOUCHER.
 *
 * GEO/TEAM FIELDS (area/route/dsm/asm/rsm) are inconsistent across the VFP-migrated
 * tables — a given customer's AREA might live on Order, or Pend, or nowhere, while
 * their DSM might only exist on GlLedger or on a SalesDis line. So every one of
 * these filters is resolved by UNIONING matching ORDNOs/vouchers across ALL FIVE
 * tables, not just one. Same approach is used for display: the enriched row shows
 * whichever table actually has a non-null value, checked in a fixed priority order.
 *
 * REQUIRED INDEXES:
 *   Pend:       { ORD: 1 }, { AREA: 1 }, { ROUT: 1 }, { DSM: 1 }, { ASM: 1 }, { RSM: 1 },
 *               { DDATE: 1 }, { TYPE: 1 }, { SVOUCHER: 1 }, { VOUCHER: 1 }, { VCN: 1 }, { MR: 1 }
 *   Order:      { ORDNO: 1 }, { STATUS: 1 }, { CITY: 1 }, { AREA: 1 }, { ROUT: 1 }, { DSM: 1 }
 *   GlLedger:   { CODE1: 1 }, { DSM: 1 }, { AREA: 1 }, { ROUT: 1 }, { ASM: 1 }, { RSM: 1 }, { BOOK: 1 }, { CD: 1 }
 *   SalesMdis:  { VOUCHER: 1 }, { GODWON: 1 }, { TRANSPORT: 1 }, { FORM: 1 }, { CHALLAN: 1 },
 *               { AREA: 1 }, { ROUT: 1 }, { DSM: 1 }, { ASM: 1 }, { RSM: 1 }
 *   SalesDis:   { VOUCHER: 1 }, { BATCH: 1 }, { DSM: 1 }, { AREA: 1 }, { ROUT: 1 }, { ASM: 1 }, { RSM: 1 }, { COMPANY: 1 }
 */
export default class OutstandingReport {
    // Priority order: SVOUCHER is tried first, VOUCHER is the fallback.
    // Add/remove fields here if your data links differently.
    private static invoiceVoucherFields: ("SVOUCHER" | "VOUCHER")[] = [
        "SVOUCHER",
        "VOUCHER",
    ];

    static async get(filter: OutstandingReportFilter = {}) {
        await dbConnect();

        const {
            search = "",
            customerCode = "",
            city = "",
            status = "",

            area = "",
            route = "",
            dsm = "",
            asm = "",
            rsm = "",

            type = "",
            mr = "",
            voucher = "",
            vcn = "",
            dueFrom = "",
            dueTo = "",
            minAmount = "",
            maxAmount = "",
            onlyOutstanding = "Y",

            book = "",
            cd = "",
            ledgerCode = "",

            godown = "",
            transport = "",
            form = "",
            challan = "",
            account = "",

            batch = "",
            company = "",

            page = 1,
            limit = 20,
            sortField = "DDATE",
            sortOrder = -1,
        } = filter;

        const pageNum = Math.max(1, Number(page) || 1);
        const pageLimit = Math.max(1, Number(limit) || 20);
        const skip = (pageNum - 1) * pageLimit;

        const compFilter = filter.companyVfpMatch || {};

        // ---- 1. Resolve search/city/status against Order ----
        let restrictToOrdnos: string[] | null = customerCode ? [customerCode] : null;

        if (search || city || status) {
            const orderMatch: any = {};

            if (search) {
                const s = escapeRegex(search);
                orderMatch.$or = [
                    { PARNAM: { $regex: s, $options: "i" } },
                    { ORDNO: { $regex: s, $options: "i" } },
                    { CODEP: { $regex: s, $options: "i" } },
                    { MAILNAM: { $regex: s, $options: "i" } },
                    { GSTNO: { $regex: s, $options: "i" } },
                ];
            }
            if (city) orderMatch.CITY = { $regex: escapeRegex(city), $options: "i" };
            if (status) orderMatch.STATUS = status;

            const orderCodes = await Order.distinct("ORDNO", combineFilters(orderMatch, compFilter));
            const set = new Set((orderCodes as string[]).filter(Boolean));

            restrictToOrdnos = restrictToOrdnos
                ? restrictToOrdnos.filter((x) => set.has(x))
                : [...set];
        }

        // ---- 2. area/route/dsm/asm/rsm: union across Pend, Order, GlLedger, MDIS, DIS ----
        if (area || route || dsm || asm || rsm) {
            const buildGeoMatch = () => {
                const m: any = {};
                if (area) m.AREA = { $regex: escapeRegex(area), $options: "i" };
                if (route) m.ROUT = { $regex: escapeRegex(route), $options: "i" };
                if (dsm) m.DSM = { $regex: escapeRegex(dsm), $options: "i" };
                if (asm) m.ASM = { $regex: escapeRegex(asm), $options: "i" };
                if (rsm) m.RSM = { $regex: escapeRegex(rsm), $options: "i" };
                return m;
            };

            const geoMatch = buildGeoMatch();

            const [pendOrds, orderOrds, glOrds, mdisVouchers, disVouchers] = await Promise.all([
                Pend.distinct("ORD", combineFilters(geoMatch, compFilter)),
                Order.distinct("ORDNO", combineFilters(geoMatch, compFilter)),
                GlLedger.distinct("CODE1", combineFilters(geoMatch, compFilter)),
                SalesMdis.distinct("VOUCHER", combineFilters(geoMatch, compFilter)),
                SalesDis.distinct("VOUCHER", combineFilters(geoMatch, compFilter)),
            ]);

            // MDIS/DIS matches are invoice-level (VOUCHER), map them back to Pend ORDs
            // through Pend's invoice-linking fields (SVOUCHER and/or VOUCHER).
            const allInvoiceVouchers = [
                ...new Set([...(mdisVouchers as number[]), ...(disVouchers as number[])]),
            ].filter((v) => v !== null && v !== undefined);

            let invoiceOrds: string[] = [];
            if (allInvoiceVouchers.length) {
                invoiceOrds = await Pend.distinct("ORD", combineFilters({
                    $or: this.invoiceVoucherFields.map((f) => ({
                        [f]: { $in: allInvoiceVouchers },
                    })),
                }, compFilter) as any);
            }

            const unionSet = new Set(
                [
                    ...(pendOrds as string[]),
                    ...(orderOrds as string[]),
                    ...(glOrds as string[]),
                    ...invoiceOrds,
                ].filter(Boolean)
            );

            restrictToOrdnos = restrictToOrdnos
                ? restrictToOrdnos.filter((x) => unionSet.has(x))
                : [...unionSet];
        }

        // ---- 3. GlLedger-level filters (book/cd/ledgerCode) -> map CODE1 back to ORD ----
        if (book || cd || ledgerCode) {
            const glMatch: any = {};
            if (book) glMatch.BOOK = { $regex: escapeRegex(book), $options: "i" };
            if (cd) glMatch.CD = cd.toUpperCase();
            if (ledgerCode) glMatch.CODE = { $regex: escapeRegex(ledgerCode), $options: "i" };

            const glOrds = await GlLedger.distinct("CODE1", combineFilters(glMatch, compFilter));
            const set = new Set((glOrds as string[]).filter(Boolean));

            restrictToOrdnos = restrictToOrdnos
                ? restrictToOrdnos.filter((x) => set.has(x))
                : [...set];
        }

        // ---- 4. invoice-level filters (godown/transport/form/challan/account) ----
        let restrictToInvoiceVouchers: number[] | null = null;

        if (godown || transport || form || challan || account) {
            const mdisMatch: any = {};
            if (godown) mdisMatch.GODWON = { $regex: escapeRegex(godown), $options: "i" };
            if (transport)
                mdisMatch.TRANSPORT = { $regex: escapeRegex(transport), $options: "i" };
            if (form) mdisMatch.FORM = { $regex: escapeRegex(form), $options: "i" };
            if (challan) mdisMatch.CHALLAN = { $regex: escapeRegex(challan), $options: "i" };
            if (account) mdisMatch.ACCOUNT = account.toUpperCase();

            const vouchers = await SalesMdis.distinct("VOUCHER", combineFilters(mdisMatch, compFilter));
            restrictToInvoiceVouchers = (vouchers as number[]).filter((v) => v != null);
        }

        // ---- 5. item/batch-level filters (batch/company) ----
        if (batch || company) {
            const disMatch: any = {};
            if (batch) disMatch.BATCH = { $regex: escapeRegex(batch), $options: "i" };
            if (company) disMatch.COMPANY = { $regex: escapeRegex(company), $options: "i" };

            const vouchers = await SalesDis.distinct("VOUCHER", combineFilters(disMatch, compFilter));
            const batchSet = new Set((vouchers as number[]).filter((v) => v != null));

            restrictToInvoiceVouchers = restrictToInvoiceVouchers
                ? restrictToInvoiceVouchers.filter((v) => batchSet.has(v))
                : [...batchSet];
        }

        // ---- 6. Build Pend match ----
        const pendMatch: any = {};
        const pendAndClauses: any[] = [];

        if (restrictToOrdnos) {
            pendMatch.ORD = {
                $in: restrictToOrdnos.length ? restrictToOrdnos : ["__NO_MATCH__"],
            };
        }

        if (restrictToInvoiceVouchers) {
            const vList = restrictToInvoiceVouchers.length ? restrictToInvoiceVouchers : [-1];
            pendAndClauses.push({
                $or: this.invoiceVoucherFields.map((f) => ({ [f]: { $in: vList } })),
            });
        }

        if (type) pendMatch.TYPE = type;
        if (mr) pendMatch.MR = { $regex: escapeRegex(mr), $options: "i" };

        // FIX: previously this could produce `pendMatch.$or = []` when `voucher` was
        // non-numeric, which matches ZERO documents (an empty $or is invalid/matches
        // nothing in MongoDB). Now we simply skip the clause when the input isn't a
        // valid number, instead of forcing an empty $or onto the whole query.
        if (voucher) {
            const numVoucher = Number(voucher);
            if (!isNaN(numVoucher)) {
                pendAndClauses.push({
                    $or: [
                        { VOUCHER: numVoucher },
                        { SVOUCHER: numVoucher },
                        { ADJVOUCHER: numVoucher },
                    ],
                });
            }
        }

        if (vcn) pendMatch.VCN = { $regex: escapeRegex(vcn), $options: "i" };

        if (dueFrom || dueTo) {
            const dateFilter = buildFYDateQuery("DDATE", dueFrom || null, dueTo || null);
            Object.assign(pendMatch, dateFilter);
        }

        if (minAmount !== "" || maxAmount !== "") {
            pendMatch.FINAL = pendMatch.FINAL || {};
            if (minAmount !== "") pendMatch.FINAL.$gte = Number(minAmount);
            if (maxAmount !== "") pendMatch.FINAL.$lte = Number(maxAmount);
        }

        if (onlyOutstanding === "Y") {
            pendMatch.FINAL = { ...(pendMatch.FINAL || {}), $ne: 0 };
        }

        const finalPendMatch = combineFilters(
            pendMatch,
            pendAndClauses.length ? { $and: pendAndClauses } : {},
            compFilter
        );

        // ---- 7. Paginate on Pend + aggregate total sum over full filtered set ----
        const sortStage: Record<string, 1 | -1> = {
            [PEND_SORTABLE_FIELDS.has(sortField) ? sortField : "DDATE"]:
                sortOrder === 1 ? 1 : -1,
        };

        const [pendRows, total, aggSummary] = await Promise.all([
            Pend.find(finalPendMatch).sort(sortStage).skip(skip).limit(pageLimit).lean(),
            Pend.countDocuments(finalPendMatch),
            Pend.aggregate([
                { $match: finalPendMatch },
                {
                    $group: {
                        _id: null,
                        totalOutstanding: { $sum: "$FINAL" },
                        distinctCustomers: { $addToSet: "$ORD" },
                        criticalOverdueAmount: {
                            $sum: {
                                $cond: [{ $gt: ["$DUEDAYS", 30] }, "$FINAL", 0],
                            },
                        },
                        criticalOverdueCount: {
                            $sum: {
                                $cond: [{ $gt: ["$DUEDAYS", 30] }, 1, 0],
                            },
                        },
                    },
                },
            ]),
        ]);

        const summary = aggSummary[0] || {
            totalOutstanding: 0,
            distinctCustomers: [],
            criticalOverdueAmount: 0,
            criticalOverdueCount: 0,
        };

        // ---- 8. Join Order + GlLedger + SalesMdis + SalesDis, only for this page ----
        const ordCodes = [...new Set(pendRows.map((r: any) => r.ORD).filter(Boolean))];

        const invoiceVouchers = [
            ...new Set(
                pendRows.flatMap((r: any) =>
                    this.invoiceVoucherFields
                        .map((f) => r[f])
                        .filter((v: any) => v !== null && v !== undefined)
                )
            ),
        ];

        const [orderRecords, glRecords, mdisRecords, disRecords] = await Promise.all([
            ordCodes.length ? Order.find(combineFilters({ ORDNO: { $in: ordCodes } }, compFilter)).lean() : Promise.resolve([]),
            ordCodes.length ? GlLedger.find(combineFilters({ CODE1: { $in: ordCodes } }, compFilter)).lean() : Promise.resolve([]),
            invoiceVouchers.length
                ? SalesMdis.find(combineFilters({ VOUCHER: { $in: invoiceVouchers } }, compFilter)).lean()
                : Promise.resolve([]),
            invoiceVouchers.length
                ? SalesDis.find(combineFilters({ VOUCHER: { $in: invoiceVouchers } }, compFilter)).lean()
                : Promise.resolve([]),
        ]);

        const orderByOrdno = new Map(orderRecords.map((o: any) => [o.ORDNO, o]));

        const glByOrdno = new Map<string, any[]>();
        for (const g of glRecords as any[]) {
            if (!g.CODE1) continue;
            if (!glByOrdno.has(g.CODE1)) glByOrdno.set(g.CODE1, []);
            glByOrdno.get(g.CODE1)!.push(g);
        }

        const mdisByVoucher = new Map(mdisRecords.map((m: any) => [m.VOUCHER, m]));

        const disByVoucher = new Map<number, any[]>();
        for (const d of disRecords as any[]) {
            if (!disByVoucher.has(d.VOUCHER)) disByVoucher.set(d.VOUCHER, []);
            disByVoucher.get(d.VOUCHER)!.push(d);
        }

        const firstNonNull = (...values: any[]) => {
            for (const v of values) {
                if (v !== null && v !== undefined && v !== "") return v;
            }
            return null;
        };

        const rows = pendRows.map((p: any) => {
            const order: any = orderByOrdno.get(p.ORD) || {};
            const glList = glByOrdno.get(p.ORD) || [];
            const gl = glList[0] || {};

            let invoice: any = null;
            let matchedInvoiceVoucher: number | undefined;
            for (const f of this.invoiceVoucherFields) {
                const candidate = p[f];
                if (candidate === null || candidate === undefined) continue;
                if (mdisByVoucher.has(candidate)) {
                    invoice = mdisByVoucher.get(candidate);
                    matchedInvoiceVoucher = candidate;
                    break;
                }
            }
            const items =
                matchedInvoiceVoucher !== undefined
                    ? disByVoucher.get(matchedInvoiceVoucher) || []
                    : [];
            const firstItem = items[0] || {};

            return {
                id: String(p._id),
                ORD: p.ORD,

                PARNAM: order.PARNAM ? String(order.PARNAM).trim() : null,
                MAILNAM: order.MAILNAM ?? null,
                CITY: order.CITY ?? null,
                CODEP: order.CODEP ?? null,
                SCODE: order.SCODE ?? null,
                STATUS: order.STATUS ?? null,
                PHONE1: order.PHONE1 ?? null,
                PHONE2: order.PHONE2 ?? null,
                GSTNO: order.GSTNO ?? null,
                DLNO: order.DLNO ?? null,

                AREA: firstNonNull(p.AREA, order.AREA, gl.AREA, invoice?.AREA, firstItem.AREA),
                ROUT: firstNonNull(p.ROUT, order.ROUT, gl.ROUT, invoice?.ROUT, firstItem.ROUT),
                DSM: firstNonNull(p.DSM, order.DSM, gl.DSM, invoice?.DSM, firstItem.DSM),
                ASM: firstNonNull(p.ASM, gl.ASM, invoice?.ASM, firstItem.ASM),
                RSM: firstNonNull(p.RSM, gl.RSM, invoice?.RSM, firstItem.RSM),

                VOUCHER: p.VOUCHER,
                SVOUCHER: p.SVOUCHER,
                ADJVOUCHER: p.ADJVOUCHER,
                ADVANCE: p.ADVANCE,
                VCN: p.VCN,
                TYPE: p.TYPE,
                MR: p.MR,
                DDATE: p.DDATE,
                DUEDAYS: p.DUEDAYS,
                FINAL: p.FINAL,
                REMARK: p.REMARK,

                ledger: gl.CODE1
                    ? {
                        CODE: gl.CODE,
                        BOOK: gl.BOOK,
                        CD: gl.CD,
                        CREDIT: gl.CREDIT,
                        DEBIT: gl.DEBIT,
                        DATE: gl.DATE,
                        REMARK1: gl.REMARK1,
                        REMARK2: gl.REMARK2,
                    }
                    : null,

                invoice: invoice
                    ? {
                        VOUCHER: invoice.VOUCHER,
                        VCN: invoice.VCN,
                        DATE: invoice.DATE,
                        DUEDAYS: invoice.DUEDAYS,
                        FINAL: invoice.FINAL,
                        GODWON: invoice.GODWON,
                        TRANSPORT: invoice.TRANSPORT,
                        LRNO: invoice.LRNO,
                        LRDA: invoice.LRDA,
                        FORM: invoice.FORM,
                        CHALLAN: invoice.CHALLAN,
                        ACCOUNT: invoice.ACCOUNT,
                        CODEP: invoice.CODEP,
                    }
                    : null,

                items: items.map((it: any) => ({
                    BATCH: it.BATCH,
                    QTY: it.QTY,
                    RATE: it.RATE,
                    MRP: it.MRP,
                    EXP: it.EXP,
                    MFD: it.MFD,
                    DSM: it.DSM,
                    COMPANY: it.COMPANY,
                    AMMMOUNT: it.AMMMOUNT,
                })),
            };
        });

        return {
            total,
            page: pageNum,
            limit: pageLimit,
            totalPages: Math.max(1, Math.ceil(total / pageLimit)),
            totalOutstanding: Number(summary.totalOutstanding || 0),
            criticalOverdueAmount: Number(summary.criticalOverdueAmount || 0),
            criticalOverdueCount: Number(summary.criticalOverdueCount || 0),
            customerCount: (summary.distinctCustomers || []).length,
            avgOutstandingAmount: total > 0 ? Math.round(Number(summary.totalOutstanding || 0) / total) : 0,
            rows,
        };
    }
}