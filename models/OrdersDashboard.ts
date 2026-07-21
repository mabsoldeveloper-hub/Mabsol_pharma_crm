import Order from "@/models/Order";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import GlLedger from "@/models/GlLedger";
import Pend from "@/models/Pend";
import SubDis from "@/models/SubDis";

/**
 * Field-mapping cheat sheet (verified against real exported data):
 *
 *   Table   | Invoice/Voucher key | Customer key | Amount field(s)
 *   --------|----------------------|--------------|---------------------------
 *   MDIS    | VCN, VOUCHER         | CODEP        | FINAL (net), COST
 *   DIS     | VCN                  | CODEP        | AMMMOUNT (note the typo!)
 *   ORDER   | -                    | SCODE        | - (name: PARNAM / MAILNAM)
 *   PRO     | CODE (product)       | -            | MRP, RATEA..RATEI
 *   PROBAT  | CODE + BATCHNO       | -            | BALANCE (stock), MRP
 *   GLEDGER | VOUCHER              | CODE         | DEBIT, CREDIT
 *   PEND    | VOUCHER              | ORD          | FINAL (+/-, can be negative)
 *   SUBDIS  | VCN, VOUCHER         | CODEP        | - (no amount on dispatch)
 *
 * DATE fields everywhere are "YYYY-MM-DD" strings, not Date objects.
 * String range queries ($gte/$lte) work fine because the format is ISO.
 *
 * VERIFIED FINDING — MDIS.TYPE:
 *   TYPE === "V" rows (334/737 in the sample export, ~45%) all have
 *   DATE = null AND VCN = null. These are unposted/void vouchers, not real
 *   orders. They are now excluded from every "order" query via
 *   REAL_ORDER_FILTER, and used to populate the cancelledOrders KPI
 *   (previously a hardcoded TODO placeholder).
 */

// Rows with TYPE "V" are unposted/void vouchers (no DATE, no VCN) — exclude
// them from anything that represents a "real" order.
const REAL_ORDER_FILTER = { TYPE: { $ne: "V" } };
const VOID_ORDER_FILTER = { TYPE: "V" };

function toMonthRange(date = new Date()) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(
        new Date(y, m + 1, 0).getDate()
    ).padStart(2, "0")}`;
    return { start, end };
}

function toYearRange(date = new Date()) {
    const y = date.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
}

const OrdersDashboard = {
    // ==========================
    // KPI CARDS (12)
    // ==========================

    async getKPICards() {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const { start: monthStart, end: monthEnd } = toMonthRange(now);
        const { start: yearStart, end: yearEnd } = toYearRange(now);

        const realOrderBase = { _vfpDeleted: { $ne: true }, ...REAL_ORDER_FILTER };

        const [
            totalOrders,
            todaysOrders,
            monthlyOrders,
            yearlyOrders,
            totalSale,
            pendingOrders,
            deliveredOrders,
            cancelledOrders,
            totalCustomers,
            totalProductsSold,
            totalCollection,
            netOutstanding,
        ] = await Promise.all([
            SalesMdis.countDocuments(realOrderBase),

            SalesMdis.countDocuments({
                ...realOrderBase,
                DATE: today,
            }),

            SalesMdis.countDocuments({
                ...realOrderBase,
                DATE: { $gte: monthStart, $lte: monthEnd },
            }),

            SalesMdis.countDocuments({
                ...realOrderBase,
                DATE: { $gte: yearStart, $lte: yearEnd },
            }),

            SalesMdis.aggregate([
                { $match: realOrderBase },
                { $group: { _id: null, total: { $sum: "$FINAL" } } },
            ]),

            Pend.countDocuments({
                _vfpDeleted: { $ne: true },
                FINAL: { $gt: 0 },
            }),

            // TODO: proxy only — SUBDIS has no delivered/in-transit flag.
            SubDis.countDocuments({ _vfpDeleted: { $ne: true } }),

            // Cancelled Orders — TYPE:"V" rows verified to be unposted/void
            // vouchers (no DATE, no VCN). Previously a hardcoded null TODO.
            SalesMdis.countDocuments({
                _vfpDeleted: { $ne: true },
                ...VOID_ORDER_FILTER,
            }),

            Order.countDocuments({ _vfpDeleted: { $ne: true } }),

            SalesDis.aggregate([
                { $match: { _vfpDeleted: { $ne: true } } },
                { $group: { _id: null, totalQty: { $sum: "$QTY" } } },
            ]),

            GlLedger.aggregate([
                { $match: { _vfpDeleted: { $ne: true } } },
                { $group: { _id: null, total: { $sum: "$CREDIT" } } },
            ]),

            Pend.aggregate([
                { $match: { _vfpDeleted: { $ne: true } } },
                { $group: { _id: null, net: { $sum: "$FINAL" } } },
            ]),
        ]);

        return {
            totalOrders,
            todaysOrders,
            monthlyOrders,
            yearlyOrders,
            totalSales: totalSale[0]?.total || 0,
            pendingOrders,
            deliveredOrders,
            cancelledOrders, // now a real count of TYPE:"V" void/unposted vouchers
            totalCustomers,
            totalProductsSold: totalProductsSold[0]?.totalQty || 0,
            totalCollection: totalCollection[0]?.total || 0,
            outstanding: netOutstanding[0]?.net || 0,
        };
    },

    // ==========================
    // ORDER SUMMARY (table)
    // ==========================

    async getOrderSummary(limit = 20) {
        return await SalesMdis.find({ _vfpDeleted: { $ne: true }, ...REAL_ORDER_FILTER })
            .select(
                "VCN VOUCHER DATE CODEP ROUT DSM NOCS FINAL COST STAXAMO CGSTAMO ADDISAMO DISCOUNT"
            )
            .sort({ DATE: -1 })
            .limit(limit)
            .lean();
    },

    // ==========================
    // LATEST ORDERS
    // ==========================

    async getLatestOrders(limit = 10) {
        return await SalesMdis.find({ _vfpDeleted: { $ne: true }, ...REAL_ORDER_FILTER })
            .select("VCN VOUCHER DATE CODEP ROUT DSM FINAL NOCS")
            .sort({ DATE: -1 })
            .limit(limit)
            .lean();
    },

    // ==========================
    // CANCELLED / VOID ORDERS (new — was a TODO placeholder before)
    // ==========================

    async getCancelledOrders(limit = 20) {
        return await SalesMdis.find({ _vfpDeleted: { $ne: true }, ...VOID_ORDER_FILTER })
            .select("VOUCHER CODEP FINAL COST NOCS TYPE")
            .sort({ VOUCHER: -1 })
            .limit(limit)
            .lean();
    },

    // ==========================
    // ORDER ITEMS (DIS + PRO + PROBAT)
    // ==========================

    async getOrderItems(limit = 20) {
        // Properly joined to PRO (product name) + PROBAT (batch expiry/MRP/stock)
        // instead of returning bare DIS.CODE / DIS.BATCH codes.
        return await SalesDis.aggregate([
            { $match: { _vfpDeleted: { $ne: true } } },
            { $sort: { DATE: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: Product.collection.name,
                    localField: "CODE",
                    foreignField: "CODE",
                    as: "productInfo",
                },
            },
            {
                $lookup: {
                    from: ProductBatch.collection.name,
                    let: { prodCode: "$CODE", batchNo: "$BATCH" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$CODE", "$$prodCode"] },
                                        { $eq: ["$BATCHNO", "$$batchNo"] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "batchInfo",
                },
            },
            { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$batchInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    VCN: 1,
                    DATE: 1,
                    CODE: 1,
                    BATCH: 1,
                    QTY: 1,
                    RATE: 1,
                    MRP: 1,
                    DISC1: 1,
                    DISC2: 1,
                    SSTAAMO: 1,
                    AMMMOUNT: 1,
                    productName: {
                        $ifNull: ["$productInfo.PRODUCT", "$productInfo.BILLNAME"],
                    },
                    batchExpiry: "$batchInfo.EXP",
                    batchMrp: "$batchInfo.MRP",
                    batchBalance: "$batchInfo.BALANCE",
                },
            },
        ]);
    },

    async getOrderItemsByInvoice(vcn: string) {
        const items = await SalesDis.find({
            VCN: vcn,
            _vfpDeleted: { $ne: true },
        }).lean();

        const codes = items.map((i: any) => i.CODE);
        const batches = items.map((i: any) => i.BATCH);

        const [products, batchDetails] = await Promise.all([
            Product.find({ CODE: { $in: codes } }).lean(),
            ProductBatch.find({ BATCHNO: { $in: batches } }).lean(),
        ]);

        return { items, products, batchDetails };
    },

    // ==========================
    // PAYMENT DETAILS (GLEDGER + PEND)
    // ==========================

    async getPaymentDetails(limit = 10) {
        return await GlLedger.find({ _vfpDeleted: { $ne: true } })
            .select("VOUCHER CODE DATE DEBIT CREDIT REMARK1 TYPE")
            .sort({ DATE: -1 })
            .limit(limit)
            .lean();
    },

    // ==========================
    // DISPATCH DETAILS (SUBDIS)
    // ==========================

    async getDispatchDetails(limit = 10) {
        return await SubDis.find({ _vfpDeleted: { $ne: true } })
            .select("VCN VOUCHER DATE CODEP DSM ROUT TYPE BOOK")
            .sort({ DATE: -1 })
            .limit(limit)
            .lean();
    },

    // ==========================
    // CHARTS
    // ==========================

    async getOrdersTrend(days = 30) {
        const data = await SalesMdis.aggregate([
            { $match: { _vfpDeleted: { $ne: true }, ...REAL_ORDER_FILTER } },
            { $group: { _id: "$DATE", orders: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: days },
        ]);
        return data.reverse();
    },

    async getDailySales(days = 30) {
        const data = await SalesMdis.aggregate([
            { $match: { _vfpDeleted: { $ne: true }, ...REAL_ORDER_FILTER } },
            { $group: { _id: "$DATE", sales: { $sum: "$FINAL" } } },
            { $sort: { _id: -1 } },
            { $limit: days },
        ]);
        return data.reverse();
    },

    async getTopCustomers(limit = 10) {
        return await SalesMdis.aggregate([
            { $match: { _vfpDeleted: { $ne: true }, ...REAL_ORDER_FILTER } },
            {
                $group: {
                    _id: "$CODEP",
                    invoices: { $sum: 1 },
                    sale: { $sum: "$FINAL" },
                },
            },
            { $sort: { sale: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: Order.collection.name,
                    localField: "_id",
                    foreignField: "SCODE",
                    as: "customer",
                },
            },
        ]);
    },

    async getTopProducts(limit = 10) {
        return await SalesDis.aggregate([
            { $match: { _vfpDeleted: { $ne: true } } },
            {
                $group: {
                    _id: "$CODE",
                    qty: { $sum: "$QTY" },
                    amount: { $sum: "$AMMMOUNT" },
                },
            },
            { $sort: { amount: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: Product.collection.name,
                    localField: "_id",
                    foreignField: "CODE",
                    as: "product",
                },
            },
        ]);
    },

    async getOutstandingBreakup(limit = 10) {
        // Highest receivable first (positive FINAL = customer owes money)
        return await Pend.find({ _vfpDeleted: { $ne: true }, FINAL: { $gt: 0 } })
            .sort({ FINAL: -1 })
            .limit(limit)
            .lean();
    },

    async getCollectionTrend(days = 30) {
        const data = await GlLedger.aggregate([
            { $match: { _vfpDeleted: { $ne: true } } },
            { $group: { _id: "$DATE", credit: { $sum: "$CREDIT" } } },
            { $sort: { _id: -1 } },
            { $limit: days },
        ]);
        return data.reverse();
    },

    // ==========================
    // RECENT ACTIVITY (right-side widgets)
    // ==========================

    async getRecentActivity() {
        const [orders, payments, dispatch] = await Promise.all([
            this.getLatestOrders(5),
            this.getPaymentDetails(5),
            this.getDispatchDetails(5),
        ]);

        return { orders, payments, dispatch };
    },

    // ==========================
    // BOTTOM ANALYTICS
    // ==========================

    async getBottomAnalytics() {
        const [agg, topProduct] = await Promise.all([
            SalesMdis.aggregate([
                { $match: { _vfpDeleted: { $ne: true }, ...REAL_ORDER_FILTER } },
                {
                    $group: {
                        _id: null,
                        avgOrderValue: { $avg: "$FINAL" },
                        highestOrder: { $max: "$FINAL" },
                        lowestOrder: { $min: "$FINAL" },
                        avgQty: { $avg: "$NOCS" },
                    },
                },
            ]),
            this.getTopProducts(1),
        ]);

        const a = agg[0] || {};

        return {
            avgOrderValue: a.avgOrderValue || 0,
            avgQty: a.avgQty || 0,
            highestOrder: a.highestOrder || 0,
            lowestOrder: a.lowestOrder || 0,
            topSellingProduct: topProduct[0] || null,
            // Collection %, Outstanding %, Profit % need a defined denominator
            // (e.g. against Total Sales) — compute in the API layer once the
            // business confirms the formula, rather than guessing here.
        };
    },
};

export default OrdersDashboard;