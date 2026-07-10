import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import MaOrder from "@/models/MaOrder";
import Pend from "@/models/Pend";
import GlLedger from "@/models/GlLedger";

export interface CustomerReportFilter {
    search?: string;

    customer?: string;
    customerCode?: string;

    area?: string;
    route?: string;
    dsm?: string;
    city?: string;

    status?: string;

    fromDate?: string;
    toDate?: string;

    page?: number;
    limit?: number;

    sortField?: string;
    sortOrder?: 1 | -1;
}

export default class CustomerReport {
    /**
     * Customer Master Report
     * Combines all 4 VFP-migrated tables:
     *   - Order    -> base customer master fields
     *   - Pend     -> outstanding amount (FINAL), pending voucher count, last due date
     *   - GlLedger -> total debit/credit, ledger balance, last transaction date
     *   - MaOrder  -> allocation/order-type records for the customer (balance, form, count)
     *
     * Join keys (all match against Order.ORDNO, the customer code e.g. "#4327"):
     *   Pend.ORD == Order.ORDNO
     *   GlLedger.CODE1 == Order.ORDNO
     *   MaOrder.ORDNO == Order.ORDNO
     *
     * NOTE: MaOrder rows frequently have ORDNO/PARNAM as null in the source data
     * (it looks more like an order-type/accounting-flag config table than a strictly
     * per-customer transactional table). Customers with no matching MaOrder record
     * will simply show blank/zero for those columns - that reflects the data, not a bug.
     *
     * NOTE: For good performance at scale, make sure Pend.ORD, GlLedger.CODE1, and
     * MaOrder.ORDNO have indexes, since $lookup without a pipeline scans the foreign
     * collection per matched document otherwise.
     */
    static async customerMaster(filter: CustomerReportFilter = {}) {
        await dbConnect();

        const {
            search = "",
            customerCode = "",
            area = "",
            route = "",
            dsm = "",
            city = "",
            status = "",
            page = 1,
            limit = 20,
            sortField = "PARNAM",
            sortOrder = 1,
        } = filter;

        const match: any = {};

        if (search) {
            match.$or = [
                { PARNAM: { $regex: search, $options: "i" } },
                { ORDNO: { $regex: search, $options: "i" } },
                { CODEP: { $regex: search, $options: "i" } },
            ];
        }

        if (customerCode) match.ORDNO = customerCode;
        if (city) match.CITY = city;
        if (area) match.AREA = area;
        if (route) match.ROUT = route;
        if (dsm) match.DSM = dsm;
        if (status) match.STATUS = status;

        const skip = (page - 1) * limit;

        const pipeline: any[] = [
            { $match: match },

            // Outstanding pending vouchers for this customer
            {
                $lookup: {
                    from: Pend.collection.collectionName,
                    localField: "ORDNO",
                    foreignField: "ORD",
                    as: "pendRecords",
                },
            },

            // Ledger (debit/credit) transactions for this customer
            {
                $lookup: {
                    from: GlLedger.collection.collectionName,
                    localField: "ORDNO",
                    foreignField: "CODE1",
                    as: "ledgerRecords",
                },
            },

            // Order-type / allocation records for this customer
            {
                $lookup: {
                    from: MaOrder.collection.collectionName,
                    localField: "ORDNO",
                    foreignField: "ORDNO",
                    as: "maOrderRecords",
                },
            },

            {
                $addFields: {
                    // Pend
                    outstandingAmount: { $sum: "$pendRecords.FINAL" },
                    pendingVouchers: { $size: "$pendRecords" },
                    lastDueDate: { $max: "$pendRecords.DDATE" },

                    // GlLedger
                    totalDebit: { $sum: "$ledgerRecords.DEBIT" },
                    totalCredit: { $sum: "$ledgerRecords.CREDIT" },
                    lastTransactionDate: { $max: "$ledgerRecords.DATE" },

                    // MaOrder
                    maOrderBalance: { $sum: "$maOrderRecords.BALANCE" },
                    maOrderCount: { $size: "$maOrderRecords" },
                    lastMaOrderDate: { $max: "$maOrderRecords.DATE" },
                    maOrderForm: { $max: "$maOrderRecords.FORM" },
                },
            },

            {
                $addFields: {
                    ledgerBalance: { $subtract: ["$totalDebit", "$totalCredit"] },
                },
            },

            {
                $project: {
                    ORDNO: 1,
                    SCODE: 1,
                    CODEP: 1,
                    PARNAM: 1,
                    CITY: 1,
                    AREA: 1,
                    ROUT: 1,
                    DSM: 1,
                    STATUS: 1,
                    BALANCE: 1,
                    DUEDAYS: 1,
                    PHONE1: 1,
                    PHONE2: 1,
                    GSTNO: 1,
                    DLNO: 1,

                    outstandingAmount: 1,
                    pendingVouchers: 1,
                    lastDueDate: 1,

                    totalDebit: 1,
                    totalCredit: 1,
                    ledgerBalance: 1,
                    lastTransactionDate: 1,

                    maOrderBalance: 1,
                    maOrderCount: 1,
                    lastMaOrderDate: 1,
                    maOrderForm: 1,
                },
            },

            { $sort: { [sortField]: sortOrder } },

            {
                $facet: {
                    rows: [{ $skip: skip }, { $limit: limit }],
                    totalCount: [{ $count: "count" }],
                },
            },
        ];

        const result = await Order.aggregate(pipeline);

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

    static async customerLedger(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async customerOutstanding(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async customerBalance(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async customerOpening(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async customerCreditLimit(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async customerDueDays(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async customerAging(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async areaWiseCustomer(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async routeWiseCustomer(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async dsmWiseCustomer(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async activeCustomers(filter: CustomerReportFilter = {}) {
        return this.customerMaster({
            ...filter,
            status: "Y",
        });
    }

    static async inactiveCustomers(filter: CustomerReportFilter = {}) {
        return this.customerMaster({
            ...filter,
            status: "N",
        });
    }

    static async newCustomers(filter: CustomerReportFilter = {}) {
        await dbConnect();

        return Order.find({})
            .sort({ DATE: -1 })
            .limit(100)
            .lean();
    }

    static async partySummary(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }

    static async collectionPending(filter: CustomerReportFilter = {}) {
        await dbConnect();
        return [];
    }
}