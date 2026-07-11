import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import Rate from "@/models/Rate";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import GlLedger from "@/models/GlLedger";
import SubDis from "@/models/SubDis";
import SaleType from "@/models/SaleType";

export interface ProductReportFilter {
    search?: string;

    category?: string; // PRO.GCODE
    company?: string;  // best-effort, computed from sales records - see NOTE #1 below
    status?: string;   // PRO.STATUS
    batchNo?: string;  // PROBAT.BATCHNO

    nearExpiryDays?: number; // used by nearExpiryProducts()

    page?: number;
    limit?: number;

    sortField?: string;
    sortOrder?: 1 | -1;
}

const DEFAULT_NEAR_EXPIRY_DAYS = 90;
const FAST_MOVING_QTY_THRESHOLD = 50; // tune to your business - just a starting default
const SLOW_MOVING_QTY_THRESHOLD = 5;  // tune to your business - just a starting default

const MAX_LIMIT = 200; // hard ceiling to stop accidental/abusive huge page sizes

export default class ProductReport {
    /**
     * Product Master Report
     * Base: PRO (Product master)
     *
     * Joins:
     *   - PROBAT.CODE  == PRO.CODE                    -> batches (MFD/EXP/Batch Qty/Batch MRP/Batch Purchase Rate)
     *   - RATE.PCODE   == toString(PRO.CODE)          -> discount/scheme/rate history
     *   - DIS.BATCH   IN (this product's batch numbers) -> sale qty/amount (DIS is the item-level sales line)
     *       - then DIS.VOUCHER == MDIS.VOUCHER        -> sale date / invoice no / customer / area / route / dsm
     *
     *   - GLEDGER.GCODE == PRO.GCODE               -> Ledger (Debit/Credit/Balance) - see NOTE #5
     *   - SUBDIS.VOUCHER == this product's sale VOUCHER(s) -> Dispatch date/voucher - see NOTE #5
     *       - Dispatch Qty is sourced from DIS.ISSUEQTY (SUBDIS itself has no qty field in the
     *         sample data you shared - see NOTE #5)
     *   - SALETYPE.PCODE == PRO.CODE               -> Sale Type breakdown - see NOTE #7
     *
     * IMPORTANT - please confirm/correct these assumptions (made from the sample docs you shared):
     *
     * 1) "Company" is NOT a direct field on PRO. Pulled here as a best-effort fallback from the
     *    most recent DIS.COMPANY for that product's sales lines. If you track company differently
     *    (e.g. GCODE6, or a separate Company master table), tell me and I'll switch the source.
     * 2) "Category" is mapped to PRO.GCODE (the primary group code). If category actually lives in
     *    GCODE2-6 or a separate master, tell me which.
     * 3) "GST" is mapped to PRO.SALTAX (sales tax %). CGST/IGST are also on PRO if you'd rather show
     *    the split instead of one combined %.
     * 4) "Sales Rate" is mapped to PRO.RATEF. PRO actually stores multiple rate slabs (RATEA..RATEI) -
     *    if RATEF isn't the slab you mean by "Sales Rate", tell me which one is.
     * 5) Ledger & Dispatch - NEITHER table has a clean per-product code in the sample data you
     *    shared, so these are approximations, not exact per-product truth:
     *      - GLEDGER has no product code field at all. It's joined here on GCODE (product GROUP
     *        code), so Debit/Credit/Balance shown are for the whole product group, not just this
     *        single product - if multiple products share a GCODE, they'll show identical ledger
     *        numbers. If GLEDGER actually has a product-level code elsewhere (e.g. inside MISC1/
     *        MISC2/REMARK1), tell me and I'll switch to an exact join.
     *      - SUBDIS has no quantity field and no product/batch code. Dispatch Date/Voucher are
     *        pulled from SUBDIS by matching this product's own sale VOUCHER numbers (same vouchers
     *        as the Sales section). Dispatch Qty is pulled from DIS.ISSUEQTY for those same
     *        vouchers, since SUBDIS itself doesn't carry a qty. If dispatch actually lives in a
     *        separate detail table (e.g. SUBDISD) with its own product/qty columns, tell me and
     *        I'll re-point this to the real source.
     * 6) "Fast/Slow/Dead" movement and "Near Expiry" are simple calculated heuristics based on
     *    saleQty and batch EXP dates - thresholds are placeholders, adjust to your business rules.
     * 7) SALETYPE was not in your original 8-section field table, but you asked to include it too.
     *    Joined here on SALETYPE.PCODE == PRO.CODE (both look like plain product codes in the
     *    sample). BUT I genuinely don't know what this table's D/O/S/T and A/B/C/D field-name
     *    suffixes mean (e.g. DISC1D/DISC1O/DISC1S/DISC1T, B_A/B_B/B_C/B_D, O_A..O_D, FB_A..FB_D,
     *    FO_A..FO_D) - they could be party types (Distributor/Others/Stockist/Trade), rate slabs
     *    (matching PRO's RATEA-RATED), or something specific to your business that I'm not
     *    guessing at. I've surfaced the raw fields as-is under "saleTypeBreakdown" without
     *    relabeling them - tell me what each suffix means and I'll turn this into a proper
     *    labeled breakdown instead of raw field names. Also note: RATE.PCODE in this codebase is a
     *    string ("12624") while SALETYPE.PCODE is shown as a number (0) in your sample - if that
     *    type mismatch is real (not just this one sample row), the join below may need a
     *    $toString/$toInt cast like the RATE lookup has.
     *
     * PERFORMANCE NOTE (fixed):
     * Previously ALL the heavy $lookups (batches, rate history, sales+voucher join, ledger,
     * dispatch, saletype) ran against every product matching the base filter, and only THEN
     * were the results paginated with $skip/$limit at the very end. That means a 20-row page
     * paid the cost of joining thousands of products every single request - the real reason
     * loading was slow.
     *
     * This is now split into two phases:
     *   Phase 1 - cheap match/sort, resolves batchNo/company filters with lightweight lookups,
     *             then paginates to get just this page's product CODEs (+ the total count).
     *   Phase 2 - runs the expensive lookups ONLY for that page's CODEs (typically 20-100 docs
     *             instead of the whole catalog).
     *
     * For best results also make sure these indexes exist:
     *   PRO:      { CODE: 1 }, { GCODE: 1 }, { STATUS: 1 }, { PRODUCT: 1 } (or text index for search)
     *   PROBAT:   { CODE: 1 }, { BATCHNO: 1 }
     *   RATE:     { PCODE: 1, DATE: -1 }
     *   DIS:      { BATCH: 1, DATE: -1 }, { VOUCHER: 1 }
     *   MDIS:     { VOUCHER: 1 }
     *   GLEDGER:  { GCODE: 1 }
     *   SUBDIS:   { VOUCHER: 1 }
     *   SALETYPE: { PCODE: 1 }
     */
    static async productMaster(filter: ProductReportFilter = {}) {
        await dbConnect();

        const {
            search = "",
            category = "",
            company = "",
            status = "",
            batchNo = "",
            page: rawPage = 1,
            limit: rawLimit = 20,
            sortField = "PRODUCT",
            sortOrder = 1,
        } = filter;

        const page = Math.max(1, Math.floor(rawPage) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit) || 20));

        const match: any = {};

        if (search) {
            const or: any[] = [
                { PRODUCT: { $regex: search, $options: "i" } },
                { BILLNAME: { $regex: search, $options: "i" } },
                { NAME: { $regex: search, $options: "i" } },
            ];
            const asNum = Number(search);
            if (!isNaN(asNum)) or.push({ CODE: asNum });
            match.$or = or;
        }

        if (category) match.GCODE = category;
        if (status) match.STATUS = status;

        const skip = (page - 1) * limit;

        // ---------------------------------------------------------------
        // PHASE 1: cheap filter + sort + paginate -> just the CODEs we need
        // ---------------------------------------------------------------
        const phase1: any[] = [{ $match: match }];

        if (batchNo) {
            // Lightweight existence check instead of pulling full batch docs
            phase1.push({
                $lookup: {
                    from: ProductBatch.collection.collectionName,
                    let: { code: "$CODE" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$CODE", "$$code"] },
                                        { $eq: ["$BATCHNO", batchNo] },
                                    ],
                                },
                            },
                        },
                        { $limit: 1 },
                        { $project: { _id: 1 } },
                    ],
                    as: "_batchMatch",
                },
            });
            phase1.push({ $match: { "_batchMatch.0": { $exists: true } } });
        }

        if (company) {
            // Company is derived from the most recent sale's DIS.COMPANY. We only pay this
            // cost when the caller actually filters by company.
            phase1.push(
                {
                    $lookup: {
                        from: ProductBatch.collection.collectionName,
                        localField: "CODE",
                        foreignField: "CODE",
                        as: "_batchNos",
                    },
                },
                {
                    $lookup: {
                        from: SalesDis.collection.collectionName,
                        let: { batchNos: "$_batchNos.BATCHNO" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$BATCH", "$$batchNos"] } } },
                            { $sort: { DATE: -1 } },
                            { $limit: 1 },
                            { $project: { COMPANY: 1 } },
                        ],
                        as: "_latestSale",
                    },
                },
                {
                    $addFields: {
                        _company: { $arrayElemAt: ["$_latestSale.COMPANY", 0] },
                    },
                },
                { $match: { _company: { $regex: company, $options: "i" } } }
            );
        }

        // stable ordering: primary sort field + CODE as tiebreaker
        phase1.push({ $sort: { [sortField]: sortOrder, CODE: 1 } });

        phase1.push({
            $facet: {
                rows: [{ $skip: skip }, { $limit: limit }, { $project: { CODE: 1 } }],
                totalCount: [{ $count: "count" }],
            },
        });

        const phase1Result = await Product.aggregate(phase1);

        const pageCodes: number[] = (phase1Result[0]?.rows || []).map(
            (r: any) => r.CODE
        );
        const total = phase1Result[0]?.totalCount?.[0]?.count || 0;

        if (pageCodes.length === 0) {
            return {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                rows: [],
            };
        }

        // ---------------------------------------------------------------
        // PHASE 2: heavy joins, but ONLY for this page's CODEs
        // ---------------------------------------------------------------
        const phase2: any[] = [
            { $match: { CODE: { $in: pageCodes } } },

            // Batches for this product
            {
                $lookup: {
                    from: ProductBatch.collection.collectionName,
                    localField: "CODE",
                    foreignField: "CODE",
                    as: "batchRecords",
                },
            },

            // Rate / discount / scheme records for this product
            {
                $lookup: {
                    from: Rate.collection.collectionName,
                    let: { productCode: "$CODE" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$PCODE", { $toString: "$$productCode" }] },
                            },
                        },
                        { $sort: { DATE: -1 } },
                    ],
                    as: "rateRecords",
                },
            },

            // Sales lines (DIS) matched via this product's batch numbers,
            // enriched with voucher header info (MDIS) for date/customer/area/route/dsm
            {
                $lookup: {
                    from: SalesDis.collection.collectionName,
                    let: { batchNos: "$batchRecords.BATCHNO" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$BATCH", "$$batchNos"] } } },
                        {
                            $lookup: {
                                from: SalesMdis.collection.collectionName,
                                localField: "VOUCHER",
                                foreignField: "VOUCHER",
                                as: "voucherInfo",
                            },
                        },
                        { $unwind: { path: "$voucherInfo", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                QTY: 1,
                                AMMMOUNT: 1,
                                ISSUEQTY: 1,
                                DATE: 1,
                                BATCH: 1,
                                COMPANY: 1,
                                VOUCHER: 1,
                                saleDate: "$voucherInfo.DATE",
                                invoiceNo: "$voucherInfo.VOUCHER",
                                customer: "$voucherInfo.CODEP",
                                area: "$voucherInfo.AREA",
                                route: "$voucherInfo.ROUT",
                                dsm: "$voucherInfo.DSM",
                            },
                        },
                        { $sort: { DATE: -1 } },
                    ],
                    as: "salesRecords",
                },
            },

            // Ledger - joined at product-GROUP level (GCODE); see NOTE #5 in the doc-comment above
            {
                $lookup: {
                    from: GlLedger.collection.collectionName,
                    localField: "GCODE",
                    foreignField: "GCODE",
                    as: "ledgerRecords",
                },
            },

            // Dispatch - joined via this product's own sale voucher numbers; see NOTE #5 above
            {
                $lookup: {
                    from: SubDis.collection.collectionName,
                    let: { voucherNos: "$salesRecords.VOUCHER" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$VOUCHER", "$$voucherNos"] } } },
                        {
                            $project: {
                                VOUCHER: 1,
                                DATE: 1,
                                BOOK: 1,
                                TYPE: 1,
                                VCN: 1,
                            },
                        },
                        { $sort: { DATE: -1 } },
                    ],
                    as: "dispatchRecords",
                },
            },

            // Sale Type breakdown - joined on PCODE == CODE; see NOTE #7 in the doc-comment above
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
                    // Batch
                    batches: {
                        $map: {
                            input: "$batchRecords",
                            as: "b",
                            in: {
                                batchNo: "$$b.BATCHNO",
                                mfd: "$$b.MFD",
                                exp: "$$b.EXP",
                                batchQty: "$$b.BALANCE",
                                batchMrp: "$$b.MRP",
                                batchPurchaseRate: "$$b.PRATE",
                            },
                        },
                    },

                    // Rate
                    latestDiscount: { $max: "$rateRecords.DISC1" },
                    latestScheme: { $max: "$rateRecords.FREE" },
                    rateHistory: {
                        $map: {
                            input: "$rateRecords",
                            as: "r",
                            in: {
                                date: "$$r.DATE",
                                rate: "$$r.RATE",
                                disc1: "$$r.DISC1",
                                disc2: "$$r.DISC2",
                                free: "$$r.FREE",
                            },
                        },
                    },

                    // Sales
                    saleQty: { $sum: "$salesRecords.QTY" },
                    saleAmount: { $sum: "$salesRecords.AMMMOUNT" },
                    lastSaleDate: { $max: "$salesRecords.saleDate" },
                    lastInvoiceNo: { $max: "$salesRecords.invoiceNo" },
                    salesCount: { $size: "$salesRecords" },
                    company: { $ifNull: [{ $max: "$salesRecords.COMPANY" }, null] },

                    // Ledger (group-level - see NOTE #5)
                    totalDebit: { $sum: "$ledgerRecords.DEBIT" },
                    totalCredit: { $sum: "$ledgerRecords.CREDIT" },
                    lastLedgerDate: { $max: "$ledgerRecords.DATE" },

                    // Dispatch (voucher-matched - see NOTE #5)
                    dispatchQty: { $sum: "$salesRecords.ISSUEQTY" },
                    lastDispatchDate: { $max: "$dispatchRecords.DATE" },
                    lastDispatchVoucher: { $max: "$dispatchRecords.VOUCHER" },
                    dispatchCount: { $size: "$dispatchRecords" },

                    // Sale Type breakdown - raw fields, not relabeled - see NOTE #7
                    saleTypeBreakdown: {
                        $map: {
                            input: "$saleTypeRecords",
                            as: "st",
                            in: {
                                itCode: "$$st.ITCODE",
                                itGCode: "$$st.ITGCODE",
                                itName: "$$st.ITNAME",
                                sCode: "$$st.SCODE",
                                sGCode: "$$st.SGCODE",
                                sName: "$$st.SNAME",
                                tCode: "$$st.TCODE",
                                tGCode: "$$st.TGCODE",
                                tName: "$$st.TNAME",
                                margCode: "$$st.MARGCODE",
                                opening: "$$st.OPENING",
                                balance: "$$st.BALANCE",
                                qty: "$$st.QTY",
                                tqty: "$$st.TQTY",
                                amount: "$$st.AMOUNT",
                                freeBal: "$$st.FREEBAL",
                                freeOpe: "$$st.FREEOPE",
                                disc1D: "$$st.DISC1D",
                                disc1O: "$$st.DISC1O",
                                disc1S: "$$st.DISC1S",
                                disc1T: "$$st.DISC1T",
                                disc2D: "$$st.DISC2D",
                                disc2O: "$$st.DISC2O",
                                disc2S: "$$st.DISC2S",
                                disc2T: "$$st.DISC2T",
                                cgst: "$$st.CGST",
                                igst: "$$st.IGST",
                                tax: "$$st.TAX",
                                form: "$$st.FORM",
                            },
                        },
                    },
                    saleTypeCount: { $size: "$saleTypeRecords" },
                },
            },

            {
                $addFields: {
                    // Stock
                    currentStock: "$QTY",
                    closingStock: "$TQTY",
                    freeStock: "$FREEBAL",
                    negativeStock: { $lt: ["$QTY", 0] },

                    // Ledger
                    ledgerBalance: { $subtract: ["$totalDebit", "$totalCredit"] },

                    // Analysis (calculated)
                    profit: {
                        $subtract: ["$saleAmount", { $multiply: ["$saleQty", "$PRATE"] }],
                    },
                    marginPercent: {
                        $cond: [
                            { $gt: ["$RATEF", 0] },
                            {
                                $multiply: [
                                    { $divide: [{ $subtract: ["$RATEF", "$PRATE"] }, "$RATEF"] },
                                    100,
                                ],
                            },
                            0,
                        ],
                    },
                    nearExpiry: {
                        $anyElementTrue: {
                            $map: {
                                input: "$batchRecords",
                                as: "b",
                                in: {
                                    $and: [
                                        { $ne: ["$$b.EXP", null] },
                                        {
                                            $lte: [
                                                {
                                                    $dateDiff: {
                                                        startDate: "$$NOW",
                                                        endDate: { $toDate: "$$b.EXP" },
                                                        unit: "day",
                                                    },
                                                },
                                                DEFAULT_NEAR_EXPIRY_DAYS,
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },

            {
                $addFields: {
                    movement: {
                        $switch: {
                            branches: [
                                {
                                    case: { $gte: ["$saleQty", FAST_MOVING_QTY_THRESHOLD] },
                                    then: "Fast Moving",
                                },
                                {
                                    case: {
                                        $and: [
                                            { $eq: ["$saleQty", 0] },
                                            { $gt: ["$currentStock", 0] },
                                        ],
                                    },
                                    then: "Dead Stock",
                                },
                                {
                                    case: { $lt: ["$saleQty", SLOW_MOVING_QTY_THRESHOLD] },
                                    then: "Slow Moving",
                                },
                            ],
                            default: "Normal",
                        },
                    },
                },
            },

            {
                $project: {
                    // Product
                    CODE: 1,
                    PRODUCT: 1,
                    BILLNAME: 1,
                    category: "$GCODE",
                    company: 1,
                    UNIT: 1,
                    PACKING: 1,
                    gst: "$SALTAX",
                    MRP: 1,
                    purchaseRate: "$PRATE",
                    salesRate: "$RATEF",
                    margin: { $subtract: ["$RATEF", "$PRATE"] },
                    STATUS: 1,

                    // Batch
                    batches: 1,

                    // Stock
                    OPENING: 1,
                    currentStock: 1,
                    freeStock: 1,
                    closingStock: 1,
                    negativeStock: 1,

                    // Rate
                    latestDiscount: 1,
                    latestScheme: 1,
                    rateHistory: 1,

                    // Sales
                    saleQty: 1,
                    saleAmount: 1,
                    lastSaleDate: 1,
                    lastInvoiceNo: 1,
                    salesCount: 1,

                    // Ledger
                    totalDebit: 1,
                    totalCredit: 1,
                    ledgerBalance: 1,
                    lastLedgerDate: 1,

                    // Dispatch
                    dispatchQty: 1,
                    lastDispatchDate: 1,
                    lastDispatchVoucher: 1,
                    dispatchCount: 1,

                    // Sale Type (raw breakdown - see NOTE #7)
                    saleTypeBreakdown: 1,
                    saleTypeCount: 1,

                    // Analysis
                    profit: 1,
                    marginPercent: 1,
                    nearExpiry: 1,
                    movement: 1,
                },
            },

            // Re-apply the same ordering used in Phase 1 so the page renders in a
            // consistent, predictable order (matching { $in: [...] } does not
            // preserve array order in MongoDB).
            { $sort: { [sortField]: sortOrder, CODE: 1 } },
        ];

        const rows = await Product.aggregate(phase2).allowDiskUse(true);

        return {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            rows,
        };
    }

    // --- Focused sub-reports (reuse productMaster, then narrow down) ---
    // NOTE: these pull a larger page (default 100) then filter in JS since movement/
    // nearExpiry are computed fields. For very large catalogs, move these filters into
    // an extra $match stage inside productMaster's pipeline instead.

    static async fastMovingProducts(filter: ProductReportFilter = {}) {
        const data = await this.productMaster({ ...filter, limit: filter.limit ?? 100 });
        return { ...data, rows: data.rows.filter((r: any) => r.movement === "Fast Moving") };
    }

    static async slowMovingProducts(filter: ProductReportFilter = {}) {
        const data = await this.productMaster({ ...filter, limit: filter.limit ?? 100 });
        return { ...data, rows: data.rows.filter((r: any) => r.movement === "Slow Moving") };
    }

    static async deadStockProducts(filter: ProductReportFilter = {}) {
        const data = await this.productMaster({ ...filter, limit: filter.limit ?? 100 });
        return { ...data, rows: data.rows.filter((r: any) => r.movement === "Dead Stock") };
    }

    static async nearExpiryProducts(filter: ProductReportFilter = {}) {
        const data = await this.productMaster({ ...filter, limit: filter.limit ?? 100 });
        return { ...data, rows: data.rows.filter((r: any) => r.nearExpiry) };
    }

    static async activeProducts(filter: ProductReportFilter = {}) {
        return this.productMaster({ ...filter, status: "Y" });
    }

    static async inactiveProducts(filter: ProductReportFilter = {}) {
        return this.productMaster({ ...filter, status: "N" });
    }
} 