import dbConnect from "@/lib/mongodb";
import Mdis from "@/models/SalesMdis";
import Dis from "@/models/SalesDis";
import Order from "@/models/Order";
import Product from "@/models/Product";
import GlLedger from "@/models/GlLedger";
import SaleType from "@/models/SaleType";

export interface GstReportFilter {
    search?: string;        // party name / GST no / voucher
    customerCode?: string;  // ORDNO / CODEP
    gstNo?: string;
    voucher?: string;       // VOUCHER or VCN
    hsn?: string;           // PRO.CODE or PRO.IMSCODE
    city?: string;
    type?: string;          // MDIS.TYPE  (S = Sale, P = Purchase etc)
    dateFrom?: string;      // "YYYY-MM-DD"
    dateTo?: string;        // "YYYY-MM-DD"

    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 1 | -1;
}

const MDIS_SORTABLE_FIELDS = new Set(["VOUCHER", "DATE", "VCN", "FINAL", "AMOUNTT", "TAXAMO"]);

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the MDIS $match stage + resolves the CODEP list when the filter
 * touches party-level fields (search / gstNo / city) that only live on ORDER.
 *
 * DIS.CODEP / MDIS.CODEP link to ORDER.ORDNO (in the sample data
 * ORDER.ORDNO === ORDER.CODEP for the same party, so we match against ORDNO).
 */
async function buildMdisMatch(filter: GstReportFilter) {
    const {
        search = "",
        customerCode = "",
        gstNo = "",
        city = "",
        voucher = "",
        type = "",
        dateFrom = "",
        dateTo = "",
    } = filter;

    const match: any = {};

    if (dateFrom || dateTo) {
        match.DATE = {};
        if (dateFrom) match.DATE.$gte = dateFrom;
        if (dateTo) match.DATE.$lte = dateTo;
    }

    if (type) match.TYPE = type;

    if (voucher) {
        const v = escapeRegex(voucher);
        const asNum = Number(voucher);
        match.$or = [
            { VCN: { $regex: v, $options: "i" } },
            ...(isNaN(asNum) ? [] : [{ VOUCHER: asNum }]),
        ];
    }

    // Party-level filters live on ORDER — resolve to a CODEP allow-list first.
    let restrictCodeps: string[] | null = customerCode ? [customerCode] : null;

    if (search || gstNo || city) {
        const orderMatch: any = {};
        const orConds: any[] = [];

        if (search) {
            const s = escapeRegex(search);
            orConds.push({ PARNAM: { $regex: s, $options: "i" } });
            orConds.push({ ORDNO: { $regex: s, $options: "i" } });
            orConds.push({ GSTNO: { $regex: s, $options: "i" } });
        }
        if (orConds.length) orderMatch.$or = orConds;
        if (gstNo) orderMatch.GSTNO = { $regex: escapeRegex(gstNo), $options: "i" };
        if (city) orderMatch.CITY = { $regex: escapeRegex(city), $options: "i" };

        const codes = await Order.distinct("ORDNO", orderMatch);
        const set = new Set((codes as string[]).filter(Boolean));

        restrictCodeps = restrictCodeps
            ? restrictCodeps.filter((c) => set.has(c))
            : [...set];
    }

    if (restrictCodeps) {
        match.CODEP = { $in: restrictCodeps.length ? restrictCodeps : ["__NO_MATCH__"] };
    }

    return match;
}

export default class GstReport {
    /**
     * GST Register — one row per invoice, party info from ORDER, item-level
     * tax rolled up from DIS (grouped by VOUCHER).
     * Tables used: MDIS + ORDER + DIS + SALETYPE
     *
     * DEDUPE NOTE: the VFP sync can leave multiple MDIS documents with the
     * same VOUCHER (re-sync / re-import). We de-duplicate by VOUCHER at the
     * DB level using $group (keeping the most-recently-synced doc), so the
     * register never shows the same invoice twice and totals stay accurate.
     */
    static async gstRegister(filter: GstReportFilter = {}) {
        await dbConnect();

        const {
            page = 1,
            limit = 20,
            sortField = "DATE",
            sortOrder = -1,
        } = filter;

        const pageNum = Math.max(1, Number(page) || 1);
        const pageLimit = Math.max(1, Number(limit) || 20);
        const skip = (pageNum - 1) * pageLimit;

        const match = await buildMdisMatch(filter);

        const sortField_ = MDIS_SORTABLE_FIELDS.has(sortField) ? sortField : "DATE";

        const pipeline: any[] = [
            { $match: match },
            // keep the latest-synced doc per VOUCHER
            { $sort: { _vfpSyncedAt: -1 } },
            { $group: { _id: "$VOUCHER", doc: { $first: "$$ROOT" } } },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { [sortField_]: sortOrder } },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: pageLimit }],
                    totalCount: [{ $count: "count" }],
                },
            },
        ];

        const [result] = await Mdis.aggregate(pipeline);
        const rows = result?.data || [];
        const total = result?.totalCount?.[0]?.count || 0;

        const vouchers = rows.map((r: any) => r.VOUCHER).filter((v: any) => v !== undefined && v !== null);
        const codeps = [...new Set(rows.map((r: any) => r.CODEP).filter(Boolean))];

        const [orders, disLines] = await Promise.all([
            codeps.length ? Order.find({ ORDNO: { $in: codeps } }).lean() : Promise.resolve([]),
            vouchers.length ? Dis.find({ VOUCHER: { $in: vouchers } }).lean() : Promise.resolve([]),
        ]);

        const taxCodes = [...new Set((disLines as any[]).map((d) => d.TAXCODE).filter(Boolean))];
        const saleTypes = taxCodes.length
            ? await SaleType.find({ TCODE: { $in: taxCodes } }).lean()
            : [];

        const orderByCodep = new Map((orders as any[]).map((o) => [o.ORDNO, o]));
        const saleTypeByCode = new Map((saleTypes as any[]).map((s) => [s.TCODE, s.TNAME]));

        const disByVoucher = new Map<number, any[]>();
        for (const d of disLines as any[]) {
            if (!disByVoucher.has(d.VOUCHER)) disByVoucher.set(d.VOUCHER, []);
            disByVoucher.get(d.VOUCHER)!.push(d);
        }

        const enrichedRows = rows.map((row: any) => {
            const order = orderByCodep.get(row.CODEP);
            const lines = disByVoucher.get(row.VOUCHER) || [];

            const taxableAmount = lines.reduce((s, l) => s + (l.AMMMOUNT || 0), 0);
            const cgstAmount = lines.reduce((s, l) => s + (l.CGSTAMO || 0), 0);
            const sgstAmount = lines.reduce((s, l) => s + (l.SSTAAMO || 0), 0);
            // Heuristic: IGST isn't a stored field — derived from header tax total.
            const igstAmount = Math.max(0, (row.TAXAMO || 0) - cgstAmount - sgstAmount);

            const saleTypeName = lines.length
                ? saleTypeByCode.get(lines[0].TAXCODE) || null
                : null;

            return {
                VOUCHER: row.VOUCHER,
                VCN: row.VCN,
                DATE: row.DATE,
                CDATE: row.CDATE,
                TYPE: row.TYPE,

                CODEP: row.CODEP,
                PARNAM: order?.PARNAM?.trim() || row.CODEP,
                CITY: order?.CITY || null,
                GSTNO: order?.GSTNO || null,
                DLNO: order?.DLNO || null,

                itemCount: lines.length,
                taxableAmount,
                cgstAmount,
                sgstAmount,
                igstAmount,
                totalTax: row.TAXAMO || 0,
                invoiceValue: row.FINAL || row.AMOUNTT || 0,

                saleType: saleTypeName,
                transport: row.TRANSPORT || null,
                lrNo: row.LRNO || null,
            };
        });

        // ---- Report-level totals across ALL matching (de-duped) vouchers ----
        const dedupedVoucherAgg = await Mdis.aggregate([
            { $match: match },
            { $sort: { _vfpSyncedAt: -1 } },
            { $group: { _id: "$VOUCHER", doc: { $first: "$$ROOT" } } },
            { $replaceRoot: { newRoot: "$doc" } },
            {
                $group: {
                    _id: null,
                    voucherList: { $push: "$VOUCHER" },
                    totalTax: { $sum: "$TAXAMO" },
                    invoiceValue: { $sum: "$FINAL" },
                    invoiceCount: { $sum: 1 },
                },
            },
        ]);

        const summaryHeader = dedupedVoucherAgg[0] || {
            voucherList: [],
            totalTax: 0,
            invoiceValue: 0,
            invoiceCount: 0,
        };

        const summaryAgg = summaryHeader.voucherList.length
            ? await Dis.aggregate([
                { $match: { VOUCHER: { $in: summaryHeader.voucherList } } },
                {
                    $group: {
                        _id: null,
                        taxableAmount: { $sum: "$AMMMOUNT" },
                        cgstAmount: { $sum: "$CGSTAMO" },
                        sgstAmount: { $sum: "$SSTAAMO" },
                    },
                },
            ])
            : [];

        const s = summaryAgg[0] || { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0 };

        return {
            total,
            page: pageNum,
            limit: pageLimit,
            totalPages: Math.max(1, Math.ceil(total / pageLimit)),
            rows: enrichedRows,
            summary: {
                invoiceCount: summaryHeader.invoiceCount || 0,
                taxableAmount: s.taxableAmount || 0,
                cgstAmount: s.cgstAmount || 0,
                sgstAmount: s.sgstAmount || 0,
                igstAmount: Math.max(0, (summaryHeader.totalTax || 0) - (s.cgstAmount || 0) - (s.sgstAmount || 0)),
                totalTax: summaryHeader.totalTax || 0,
                invoiceValue: summaryHeader.invoiceValue || 0,
            },
        };
    }

    /**
     * HSN Summary — DIS lines grouped by product (PRO.CODE), joined to PRO
     * for HSN (IMSCODE) / product name / UOM.
     * Tables used: DIS + PRO (+ MDIS to resolve the filtered voucher list)
     *
     * NULL-CODE NOTE: some DIS lines have CODE = null/undefined in the
     * migrated data. Without $ifNull these would form multiple separate
     * "null" groups that collide on the same React key client-side, so we
     * coalesce them into a single "UNSPECIFIED" bucket here at the DB level.
     */
    static async hsnSummary(filter: GstReportFilter = {}) {
        await dbConnect();

        const { page = 1, limit = 20, hsn = "" } = filter;

        const pageNum = Math.max(1, Number(page) || 1);
        const pageLimit = Math.max(1, Number(limit) || 20);

        const mdisMatch = await buildMdisMatch(filter);
        const vouchers = await Mdis.distinct("VOUCHER", mdisMatch);

        if (!vouchers.length) {
            return {
                total: 0,
                page: pageNum,
                limit: pageLimit,
                totalPages: 1,
                rows: [],
            };
        }

        const grouped = await Dis.aggregate([
            {
                $match: {
                    VOUCHER: { $in: vouchers },
                },
            },
            {
                $group: {
                    _id: { $ifNull: ["$CODE", "UNSPECIFIED"] },
                    qty: { $sum: "$QTY" },
                    taxableAmount: { $sum: "$AMMMOUNT" },
                    cgstAmount: { $sum: "$CGSTAMO" },
                    sgstAmount: { $sum: "$SSTAAMO" },
                },
            },
            {
                $sort: {
                    taxableAmount: -1,
                },
            },
        ]);

        const productCodes = grouped
            .map((g) => g._id)
            .filter((c) => c !== "UNSPECIFIED");

        const products = productCodes.length
            ? await Product.find({
                CODE: { $in: productCodes },
            }).lean()
            : [];

        const productByCode = new Map(
            (products as any[]).map((p) => [p.CODE, p])
        );

        // Product.GCODE6 -> SaleType.SCODE
        const scodes = [
            ...new Set(
                (products as any[])
                    .map((p) => p.GCODE6)
                    .filter(Boolean)
            ),
        ];

        const saleTypes = await SaleType.find({
            SCODE: { $in: scodes },
        }).lean();

        const saleTypeByScode = new Map(
            (saleTypes as any[]).map((s) => [s.SCODE, s])
        );

        let filteredGrouped = grouped;

        if (hsn) {
            const h = hsn.toLowerCase();

            filteredGrouped = grouped.filter((g) => {

                const p = productByCode.get(g._id);

                const saleType = saleTypeByScode.get(p?.GCODE6);

                const hsnCode = String(
                    saleType?.SNAME || ""
                ).toLowerCase();

                return (
                    hsnCode.includes(h) ||
                    String(g._id).toLowerCase().includes(h)
                );
            });
        }

        const total = filteredGrouped.length;

        const start = (pageNum - 1) * pageLimit;

        const pageSlice = filteredGrouped.slice(
            start,
            start + pageLimit
        );

        const rows = pageSlice.map((g) => {

            const p = productByCode.get(g._id);

            const saleType = saleTypeByScode.get(p?.GCODE6);

            return {

                productCode: g._id,

                productName:
                    p?.PRODUCT ||
                    p?.BILLNAME ||
                    "Unknown",

                // HSN from SaleType.SNAME
                hsnCode:
                    saleType?.SNAME || "-",

                unit:
                    p?.UNIT || "-",

                cgstRate:
                    p?.CGST ?? null,

                igstRate:
                    p?.IGST ?? null,

                qty:
                    g.qty || 0,

                taxableAmount:
                    g.taxableAmount || 0,

                cgstAmount:
                    g.cgstAmount || 0,

                sgstAmount:
                    g.sgstAmount || 0,
            };

        });

        return {
            total,
            page: pageNum,
            limit: pageLimit,
            totalPages: Math.max(
                1,
                Math.ceil(total / pageLimit)
            ),
            rows,
        };
    }
    /**
     * GST Ledger — GLEDGER entries linked to invoice via VOUCHER, joined
     * with MDIS (invoice value) and ORDER (party, via GLEDGER.CODE1 = ORDER.ORDNO).
     * Tables used: GLEDGER + MDIS + ORDER
     */
    static async gstLedger(filter: GstReportFilter = {}) {
        await dbConnect();

        const {
            page = 1,
            limit = 20,
            dateFrom = "",
            dateTo = "",
            customerCode = "",
            voucher = "",
        } = filter;

        const pageNum = Math.max(1, Number(page) || 1);
        const pageLimit = Math.max(1, Number(limit) || 20);
        const skip = (pageNum - 1) * pageLimit;

        const match: any = {};
        if (dateFrom || dateTo) {
            match.DATE = {};
            if (dateFrom) match.DATE.$gte = dateFrom;
            if (dateTo) match.DATE.$lte = dateTo;
        }
        if (customerCode) match.CODE1 = customerCode;
        if (voucher) {
            const asNum = Number(voucher);
            if (!isNaN(asNum)) match.VOUCHER = asNum;
        }

        const [rows, total] = await Promise.all([
            GlLedger.find(match).sort({ DATE: -1, _id: -1 }).skip(skip).limit(pageLimit).lean(),
            GlLedger.countDocuments(match),
        ]);

        const codeps = [...new Set(rows.map((r: any) => r.CODE1).filter(Boolean))];
        const vouchers = [...new Set(rows.map((r: any) => r.VOUCHER).filter(Boolean))];

        const [orders, mdisRows] = await Promise.all([
            codeps.length ? Order.find({ ORDNO: { $in: codeps } }).lean() : Promise.resolve([]),
            vouchers.length ? Mdis.find({ VOUCHER: { $in: vouchers } }).lean() : Promise.resolve([]),
        ]);

        const orderByCode = new Map((orders as any[]).map((o) => [o.ORDNO, o]));
        const mdisByVoucher = new Map((mdisRows as any[]).map((m) => [m.VOUCHER, m]));

        const enrichedRows = rows.map((row: any) => {
            const order = orderByCode.get(row.CODE1);
            const mdis = mdisByVoucher.get(row.VOUCHER);
            return {
                _id: String(row._id),
                VOUCHER: row.VOUCHER,
                DATE: row.DATE,
                CODE1: row.CODE1,
                PARNAM: order?.PARNAM?.trim() || row.CODE1,
                GSTNO: order?.GSTNO || null,
                DEBIT: row.DEBIT || 0,
                CREDIT: row.CREDIT || 0,
                TYPE: row.TYPE,
                invoiceValue: mdis?.FINAL ?? null,
                invoiceTax: mdis?.TAXAMO ?? null,
            };
        });

        return {
            total,
            page: pageNum,
            limit: pageLimit,
            totalPages: Math.max(1, Math.ceil(total / pageLimit)),
            rows: enrichedRows,
        };
    }
}