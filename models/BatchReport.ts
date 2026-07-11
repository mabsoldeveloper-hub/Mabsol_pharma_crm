import dbConnect from "@/lib/mongodb";
import ProductBatch from "@/models/ProductBatch";   // PROBAT
import Product from "@/models/Product";             // PRO
import SalesDis from "@/models/SalesDis";           // DIS
import SalesMdis from "@/models/SalesMdis";         // MDIS
import GlLedger from "@/models/GlLedger";           // GLEDGER
import Rate from "@/models/Rate";                   // RATE
import SubDis from "@/models/SubDis";               // SUBDIS
import SaleType from "@/models/SaleType";           // SALETYPE

export interface BatchReportFilter {
    search?: string;        // free text: batch no / product / billname / supplier

    batchNo?: string;       // PROBAT.BATCHNO
    productCode?: string;   // PROBAT.CODE
    productName?: string;   // PROBAT.PRODUCT / NAME
    supplier?: string;      // PROBAT.SUPCODE

    // These live inside DIS (sales), not PROBAT. They are resolved to a set of
    // matching {CODE, BATCH} pairs *before* the main query runs (see
    // resolveDisFilteredBatchKeys), so the main pipeline never needs to look up
    // DIS just to decide which batches qualify.
    party?: string;         // DIS.CODEP
    dsm?: string;           // DIS.DSM
    area?: string;          // DIS.AREA
    route?: string;         // DIS.ROUT

    status?: string;        // PROBAT.SELECT (Y/N)

    fromDate?: string;      // PROBAT.DATE range (yyyy-mm-dd string)
    toDate?: string;

    page?: number;
    limit?: number;

    sortField?: string;
    sortOrder?: 1 | -1;
}

/**
 * Builds a trim + case-insensitive equality condition for use inside $expr.
 * VFP-sourced char fields are frequently space-padded (e.g. "AFRO   "),
 * so a plain $eq against a clean filter value would silently match nothing.
 */
function trimmedEq(fieldPath: string, value: string) {
    return {
        $eq: [
            { $toUpper: { $trim: { input: { $ifNull: [fieldPath, ""] } } } },
            value.trim().toUpperCase(),
        ],
    };
}

// Safety cap on how many distinct (CODE, BATCH) keys we'll pull back from the
// pre-resolve step below. If a filter is broad enough to match more than this,
// it's too broad to be a useful "which batches" filter anyway — ask the user
// to narrow it further (add a date range, a more specific DSM/area, etc).
const MAX_DIS_KEYS = 5000;

export default class BatchReport {
    /**
     * Resolves party/dsm/area/route filters against SalesDis directly and
     * returns the distinct {CODE, BATCH} pairs that match. This runs BEFORE
     * the main ProductBatch pipeline so that filtering, sorting, and counting
     * all happen on lightweight base documents — the expensive per-batch
     * lookups (MDIS/GLEDGER/SUBDIS/RATE/SALETYPE) only ever run on the final
     * paginated page, never on the whole matched set.
     */
    private static async resolveDisFilteredBatchKeys(f: {
        party?: string;
        dsm?: string;
        area?: string;
        route?: string;
    }) {
        const expr: any[] = [];
        if (f.party) expr.push(trimmedEq("$CODEP", f.party));
        if (f.dsm) expr.push(trimmedEq("$DSM", f.dsm));
        if (f.area) expr.push(trimmedEq("$AREA", f.area));
        if (f.route) expr.push(trimmedEq("$ROUT", f.route));

        if (expr.length === 0) return null; // no dis-side filter active

        const matches = await SalesDis.aggregate([
            { $match: { $expr: { $and: expr } } },
            { $group: { _id: { CODE: "$CODE", BATCH: "$BATCH" } } },
            { $limit: MAX_DIS_KEYS },
        ]);

        return matches.map((m: any) => ({ CODE: m._id.CODE, BATCHNO: m._id.BATCH }));
    }

    /**
     * Batch Master Report
     * Base table: ProductBatch (PROBAT) — one row per batch of a product.
     *
     * Query shape (memory-safe):
     *   1. $match  -> cheap filters only (regex/range/trimmed $expr), on the
     *                 base PROBAT documents, optionally narrowed by the
     *                 pre-resolved DIS keys from resolveDisFilteredBatchKeys.
     *   2. $sort   -> runs on the small base documents, BEFORE any $lookup,
     *                 so it never touches the enriched/nested data and can't
     *                 blow the in-memory sort limit.
     *   3. $facet  -> "rows" branch does $skip + $limit FIRST, then attaches
     *                 Product/DIS/MDIS/GLEDGER/SUBDIS/RATE/SALETYPE lookups
     *                 only to that page of (at most `limit`) documents.
     *                 "totalCount" branch just counts — no lookups.
     *
     * Combines:
     *   - Product   (PRO)      -> product master info (status, group, scheme flags)
     *   - SalesDis  (DIS)      -> batch-wise sales transactions
     *                             (CODE == PROBAT.CODE AND BATCH == PROBAT.BATCHNO)
     *   - SalesMdis (MDIS)     -> invoice header for the vouchers found in DIS
     *   - GlLedger  (GLEDGER)  -> ledger debit/credit for those same vouchers
     *   - SubDis    (SUBDIS)   -> sub-distribution/return entries for those vouchers
     *   - Rate      (RATE)     -> current rate/discount master
     *                             (RATE.PCODE == String(PROBAT.CODE), trimmed)
     *   - SaleType  (SALETYPE) -> tax/sale-type config
     *                             (SALETYPE.PCODE == PROBAT.CODE)
     *
     * NOTE ON PERFORMANCE / INDEXES:
     *   ProductBatch: index whatever sortField is commonly used (DATE, BATCHNO, CODE)
     *   SalesDis:     { CODE: 1, BATCH: 1 }, VOUCHER: 1
     *   SalesMdis:    VOUCHER: 1
     *   GlLedger:     VOUCHER: 1
     *   SubDis:       VOUCHER: 1
     *   Rate:         PCODE: 1
     *   SaleType:     PCODE: 1
     *   Product:      CODE: 1
     * The trimmed $expr comparisons (status, party/dsm/area/route) can't use a
     * plain index the way $eq can. If those filters get heavy production use,
     * consider storing a pre-trimmed/upper-cased copy of those fields at write
     * time and indexing that copy instead.
     */
    static async batchMaster(filter: BatchReportFilter = {}) {
        await dbConnect();

        const {
            search = "",
            batchNo = "",
            productCode = "",
            productName = "",
            supplier = "",
            party = "",
            dsm = "",
            area = "",
            route = "",
            status = "",
            fromDate = "",
            toDate = "",
            page = 1,
            limit = 20,
            sortField = "DATE",
            sortOrder = -1,
        } = filter;

        // ---- Resolve sales-side filters FIRST (cheap, targeted query) ----
        const disKeys = await this.resolveDisFilteredBatchKeys({ party, dsm, area, route });

        if (disKeys !== null && disKeys.length === 0) {
            // party/dsm/area/route filter given but nothing in DIS matches it —
            // no batch can possibly qualify, skip the main query entirely.
            return { total: 0, page, limit, totalPages: 0, rows: [] };
        }

        // ---- Base match on PROBAT (regex / range / trimmed conditions) ----
        const and: any[] = [];

        if (search) {
            and.push({
                $or: [
                    { BATCHNO: { $regex: search, $options: "i" } },
                    { PRODUCT: { $regex: search, $options: "i" } },
                    { NAME: { $regex: search, $options: "i" } },
                    { BILLNAME: { $regex: search, $options: "i" } },
                    { SUPCODE: { $regex: search, $options: "i" } },
                ],
            });
        }

        if (batchNo) and.push({ BATCHNO: { $regex: batchNo, $options: "i" } });

        if (productCode) {
            const num = Number(productCode);
            and.push({ CODE: Number.isNaN(num) ? productCode : num });
        }

        if (productName) {
            and.push({
                $or: [
                    { PRODUCT: { $regex: productName, $options: "i" } },
                    { NAME: { $regex: productName, $options: "i" } },
                ],
            });
        }

        if (supplier) and.push({ SUPCODE: { $regex: supplier, $options: "i" } });

        if (fromDate || toDate) {
            const dateCond: any = {};
            if (fromDate) dateCond.$gte = fromDate;
            if (toDate) dateCond.$lte = toDate;
            and.push({ DATE: dateCond });
        }

        if (disKeys !== null) {
            and.push({ $or: disKeys.map((k) => ({ CODE: k.CODE, BATCHNO: k.BATCHNO })) });
        }

        const match: any = and.length ? { $and: and } : {};

        const skip = (page - 1) * limit;

        const statusExpr = status ? [trimmedEq("$SELECT", status)] : [];

        // Only used to narrow which DIS records are *shown* in the detail
        // panel for the page's rows — actual batch-level filtering already
        // happened via resolveDisFilteredBatchKeys above.
        const disDisplayExpr: any[] = [];
        if (party) disDisplayExpr.push(trimmedEq("$CODEP", party));
        if (dsm) disDisplayExpr.push(trimmedEq("$DSM", dsm));
        if (area) disDisplayExpr.push(trimmedEq("$AREA", area));
        if (route) disDisplayExpr.push(trimmedEq("$ROUT", route));

        const pipeline: any[] = [
            { $match: match },

            ...(statusExpr.length
                ? [{ $match: { $expr: { $and: statusExpr } } }]
                : []),

            // Sort happens here — on plain PROBAT documents, nothing attached yet.
            { $sort: { [sortField]: sortOrder } },

            {
                $facet: {
                    totalCount: [{ $count: "count" }],

                    rows: [
                        { $skip: skip },
                        { $limit: limit },

                        // ---- Everything below only ever touches `limit` docs ----

                        {
                            $lookup: {
                                from: Product.collection.collectionName,
                                localField: "CODE",
                                foreignField: "CODE",
                                as: "productInfo",
                            },
                        },
                        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },

                        {
                            $lookup: {
                                from: SalesDis.collection.collectionName,
                                let: { pCode: "$CODE", pBatch: "$BATCHNO" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$CODE", "$$pCode"] },
                                                    { $eq: ["$BATCH", "$$pBatch"] },
                                                    ...disDisplayExpr,
                                                ],
                                            },
                                        },
                                    },
                                    { $sort: { DATE: -1 } },
                                    {
                                        $project: {
                                            _id: 0,
                                            VOUCHER: 1,
                                            VCN: 1,
                                            DATE: 1,
                                            CODEP: 1,
                                            DSM: 1,
                                            AREA: 1,
                                            ROUT: 1,
                                            QTY: 1,
                                            ISSUEQTY: 1,
                                            RATE: 1,
                                            AMMMOUNT: 1,
                                            FREE: 1,
                                            FLAG: 1,
                                        },
                                    },
                                ],
                                as: "disRecords",
                            },
                        },

                        { $addFields: { disVouchers: "$disRecords.VOUCHER" } },

                        {
                            $lookup: {
                                from: SalesMdis.collection.collectionName,
                                let: { vouchers: "$disVouchers" },
                                pipeline: [
                                    { $match: { $expr: { $in: ["$VOUCHER", "$$vouchers"] } } },
                                    {
                                        $project: {
                                            _id: 0,
                                            VOUCHER: 1,
                                            VCN: 1,
                                            DATE: 1,
                                            CODEP: 1,
                                            FINAL: 1,
                                            DUEDAYS: 1,
                                            TRANSPORT: 1,
                                            LRNO: 1,
                                            TYPE: 1,
                                        },
                                    },
                                ],
                                as: "mdisRecords",
                            },
                        },

                        {
                            $lookup: {
                                from: GlLedger.collection.collectionName,
                                let: { vouchers: "$disVouchers" },
                                pipeline: [
                                    { $match: { $expr: { $in: ["$VOUCHER", "$$vouchers"] } } },
                                    {
                                        $project: {
                                            _id: 0,
                                            VOUCHER: 1,
                                            DATE: 1,
                                            CODE1: 1,
                                            DEBIT: 1,
                                            CREDIT: 1,
                                            TYPE: 1,
                                            REMARK1: 1,
                                        },
                                    },
                                ],
                                as: "ledgerRecords",
                            },
                        },

                        {
                            $lookup: {
                                from: SubDis.collection.collectionName,
                                let: { vouchers: "$disVouchers" },
                                pipeline: [
                                    { $match: { $expr: { $in: ["$VOUCHER", "$$vouchers"] } } },
                                    {
                                        $project: {
                                            _id: 0,
                                            VOUCHER: 1,
                                            DATE: 1,
                                            CODEP: 1,
                                            BOOK: 1,
                                            TYPE: 1,
                                            VCN: 1,
                                        },
                                    },
                                ],
                                as: "subDisRecords",
                            },
                        },

                        {
                            $lookup: {
                                from: Rate.collection.collectionName,
                                let: { codeStr: { $toString: "$CODE" } },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [
                                                    { $trim: { input: { $ifNull: ["$PCODE", ""] } } },
                                                    "$$codeStr",
                                                ],
                                            },
                                        },
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            PCODE: 1,
                                            GCODE: 1,
                                            DISC1: 1,
                                            DISC2: 1,
                                            RATE: 1,
                                            DATE: 1,
                                        },
                                    },
                                ],
                                as: "rateRecords",
                            },
                        },

                        {
                            $lookup: {
                                from: SaleType.collection.collectionName,
                                localField: "CODE",
                                foreignField: "PCODE",
                                as: "saleTypeRecords",
                            },
                        },

                        {
                            $addFields: {
                                totalSoldQty: { $sum: "$disRecords.ISSUEQTY" },
                                totalSoldAmount: { $sum: "$disRecords.AMMMOUNT" },
                                salesVoucherCount: { $size: "$disRecords" },
                                lastSaleDate: { $max: "$disRecords.DATE" },

                                totalInvoiceFinal: { $sum: "$mdisRecords.FINAL" },
                                invoiceCount: { $size: "$mdisRecords" },

                                totalDebit: { $sum: "$ledgerRecords.DEBIT" },
                                totalCredit: { $sum: "$ledgerRecords.CREDIT" },

                                subDisCount: { $size: "$subDisRecords" },

                                currentDisc1: { $max: "$rateRecords.DISC1" },
                                currentDisc2: { $max: "$rateRecords.DISC2" },
                            },
                        },
                        {
                            $addFields: {
                                ledgerBalance: { $subtract: ["$totalCredit", "$totalDebit"] },
                            },
                        },

                        {
                            $project: {
                                BATCHNO: 1,
                                CODE: 1,
                                NAME: 1,
                                PRODUCT: 1,
                                BILLNAME: 1,
                                PACKING: 1,
                                UNIT: 1,
                                UNIT2: 1,
                                SUPCODE: 1,
                                SUPDAT: 1,
                                SUPINVO: 1,
                                DATE: 1,
                                MFD: 1,
                                EXP: 1,
                                MRP: 1,
                                PRATE: 1,
                                LPRATE: 1,
                                OPENING: 1,
                                BALANCE: 1,
                                QTY: 1,
                                TQTY: 1,
                                CGST: 1,
                                IGST: 1,
                                BSALTAX: 1,
                                DECIMAL: 1,
                                SELECT: 1,
                                HOLD: 1,

                                productInfo: {
                                    STATUS: "$productInfo.STATUS",
                                    GCODE: "$productInfo.GCODE",
                                    MINIMUM: "$productInfo.MINIMUM",
                                    MAXIMUM: "$productInfo.MAXIMUM",
                                    HALFSCHE: "$productInfo.HALFSCHE",
                                    QTRSCHE: "$productInfo.QTRSCHE",
                                    TAXC: "$productInfo.TAXC",
                                    TAXL: "$productInfo.TAXL",
                                    masterBalance: "$productInfo.BALANCE",
                                },

                                totalSoldQty: 1,
                                totalSoldAmount: 1,
                                salesVoucherCount: 1,
                                lastSaleDate: 1,
                                totalInvoiceFinal: 1,
                                invoiceCount: 1,
                                totalDebit: 1,
                                totalCredit: 1,
                                ledgerBalance: 1,
                                subDisCount: 1,
                                currentDisc1: 1,
                                currentDisc2: 1,

                                disRecords: 1,
                                mdisRecords: 1,
                                ledgerRecords: 1,
                                subDisRecords: 1,
                                rateRecords: 1,
                                saleTypeRecords: 1,
                            },
                        },
                    ],
                },
            },
        ];

        const result = await ProductBatch.aggregate(pipeline);

        const rows = result[0]?.rows || [];
        const total = result[0]?.totalCount?.[0]?.count || 0;

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            rows,
        };
    }

    /** Batches expiring within `days` (default 90), soonest first. */
    static async expiringBatches(filter: BatchReportFilter & { days?: number } = {}) {
        await dbConnect();

        const { days = 90, limit = 50 } = filter;

        const today = new Date();
        const cutoff = new Date();
        cutoff.setDate(today.getDate() + days);

        return ProductBatch.find({
            EXP: {
                $ne: null,
                $gte: today.toISOString().slice(0, 10),
                $lte: cutoff.toISOString().slice(0, 10),
            },
        })
            .sort({ EXP: 1 })
            .limit(limit)
            .lean();
    }

    /** Batches with zero or negative closing balance (dead/over-issued stock). */
    static async zeroBalanceBatches(filter: BatchReportFilter = {}) {
        await dbConnect();

        const { limit = 50 } = filter;

        return ProductBatch.find({ BALANCE: { $lte: 0 } })
            .sort({ BALANCE: 1 })
            .limit(limit)
            .lean();
    }
}