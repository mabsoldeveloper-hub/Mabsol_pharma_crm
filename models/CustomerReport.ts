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

    page?: number;
    limit?: number;

    sortField?: string;
    sortOrder?: 1 | -1;
}

// Fields that actually live on the Order document itself — safe to $sort on directly.
const ORDER_SORTABLE_FIELDS = new Set([
    "ORDNO",
    "SCODE",
    "CODEP",
    "PARNAM",
    "CITY",
    "STATUS",
    "BALANCE",
    "DUEDAYS",
]);

// Escape user input before dropping it into a $regex — otherwise characters like
// ( ) . * + ? [ ] can throw invalid-regex errors or silently change what matches.
function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default class CustomerReport {
    /**
     * Customer Master Report
     * Combines all 4 VFP-migrated tables:
     *   - Order    -> base customer master fields
     *   - Pend     -> outstanding amount (FINAL), pending voucher count, last due date,
     *                 and (in practice) the customer's AREA / ROUT
     *   - GlLedger -> total debit/credit, ledger balance, last transaction date,
     *                 and (in practice) the customer's DSM
     *   - MaOrder  -> allocation/order-type records for the customer (balance, form, count)
     *
     * IMPORTANT DATA NOTE:
     * Order.AREA / Order.ROUT / Order.DSM are populated for some customers but not
     * others in the migrated data — the rest live only on Pend (AREA, ROUT) and
     * GlLedger (DSM). This method handles that inconsistency by:
     *   1. FILTERING - area/route/dsm filters check BOTH the Order fields directly
     *      AND the corresponding Pend/GlLedger fields, and union the matching
     *      ORDNOs, so a customer matches regardless of which table actually holds
     *      the value for them. Order is then filtered with `ORDNO: { $in: [...] }`.
     *   2. DISPLAY - the AREA/ROUT/DSM values returned per row prefer Order's own
     *      value if present, falling back to the matched Pend/GlLedger record.
     *
     * FILTER SEMANTICS:
     *   - area + route: a single Pend record matching both, OR Order's own
     *     AREA/ROUT matching both — unioned.
     *   - dsm: GlLedger.DSM OR Order.DSM — unioned.
     *   - There is no date-range filter (removed on request).
     *
     * PERFORMANCE NOTE:
     * Pagination happens on the (cheap) Order query FIRST; Pend/GlLedger/MaOrder are
     * only joined for the ORDNOs on the current page via a small, indexed `$in` query
     * — not for the entire matched result set.
     *
     * REQUIRED INDEXES:
     *   Order:     { ORDNO: 1 }, { STATUS: 1 }, { CITY: 1 }, { AREA: 1 }, { ROUT: 1 }, { DSM: 1 }
     *   Pend:      { ORD: 1 }, { AREA: 1 }, { ROUT: 1 }
     *   GlLedger:  { CODE1: 1 }, { DSM: 1 }
     *   MaOrder:   { ORDNO: 1 }
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

        const pageNum = Math.max(1, Number(page) || 1);
        const pageLimit = Math.max(1, Number(limit) || 20);
        const skip = (pageNum - 1) * pageLimit;

        // ---- 1. Base match against fields that genuinely live on Order ----
        const match: any = {};

        if (search) {
            const s = escapeRegex(search);
            match.$or = [
                { PARNAM: { $regex: s, $options: "i" } },
                { ORDNO: { $regex: s, $options: "i" } },
                { CODEP: { $regex: s, $options: "i" } },
            ];
        }

        if (city) match.CITY = { $regex: escapeRegex(city), $options: "i" };
        if (status) match.STATUS = status;

        // ---- 2. Resolve area / route / dsm against Order, Pend & GlLedger ----
        // Data quality across the VFP-migrated tables is inconsistent — a given
        // customer might have AREA/ROUT/DSM populated on Order directly, or only on
        // Pend/GlLedger, or (rarely) both. So each filter checks every table that
        // could plausibly hold the value and unions the matching ORDNOs, instead of
        // assuming only one source is authoritative (that assumption is what made
        // the DSM filter miss customers whose DSM only exists on Order).
        let restrictToOrdnos: string[] | null = customerCode ? [customerCode] : null;

        const requiredSets: string[][] = [];

        // area + route: check Pend (AREA/ROUT together on one record) AND Order's own
        // AREA/ROUT fields, then union the results.
        if (area || route) {
            const pendMatch: any = {};
            if (area) pendMatch.AREA = { $regex: escapeRegex(area), $options: "i" };
            if (route) pendMatch.ROUT = { $regex: escapeRegex(route), $options: "i" };

            const orderMatch: any = {};
            if (area) orderMatch.AREA = { $regex: escapeRegex(area), $options: "i" };
            if (route) orderMatch.ROUT = { $regex: escapeRegex(route), $options: "i" };

            const [pendCodes, orderCodes] = await Promise.all([
                Pend.distinct("ORD", pendMatch),
                Order.distinct("ORDNO", orderMatch),
            ]);

            const union = new Set(
                [...(pendCodes as string[]), ...(orderCodes as string[])].filter(Boolean)
            );
            requiredSets.push([...union]);
        }

        // dsm: check GlLedger.DSM AND Order.DSM, then union the results.
        if (dsm) {
            const dsmRegex = { $regex: escapeRegex(dsm), $options: "i" };

            const [glCodes, orderCodes] = await Promise.all([
                GlLedger.distinct("CODE1", { DSM: dsmRegex }),
                Order.distinct("ORDNO", { DSM: dsmRegex }),
            ]);

            const union = new Set(
                [...(glCodes as string[]), ...(orderCodes as string[])].filter(Boolean)
            );
            requiredSets.push([...union]);
        }

        if (requiredSets.length) {
            // Every supplied filter TYPE must be satisfied (AND across types)
            let intersected = requiredSets.reduce((a, b) => {
                const bSet = new Set(b);
                return a.filter((x) => bSet.has(x));
            });

            if (restrictToOrdnos) {
                const intersectedSet = new Set(intersected);
                restrictToOrdnos = restrictToOrdnos.filter((x) => intersectedSet.has(x));
            } else {
                restrictToOrdnos = intersected;
            }
        }

        if (restrictToOrdnos) {
            match.ORDNO = { $in: restrictToOrdnos.length ? restrictToOrdnos : ["__NO_MATCH__"] };
        }

        // ---- 3. Cheap paginate FIRST (no joins yet) ----
        const sortStage: Record<string, 1 | -1> = {
            [ORDER_SORTABLE_FIELDS.has(sortField) ? sortField : "PARNAM"]: sortOrder,
        };

        const [rows, total] = await Promise.all([
            Order.find(match).sort(sortStage).skip(skip).limit(pageLimit).lean(),
            Order.countDocuments(match),
        ]);

        const ordnos = rows.map((r: any) => r.ORDNO).filter(Boolean);

        // ---- 4. Only now fetch related data, only for customers on this page ----
        const [pendRecords, ledgerRecords, maOrderRecords] = await Promise.all([
            ordnos.length ? Pend.find({ ORD: { $in: ordnos } }).lean() : Promise.resolve([]),
            ordnos.length ? GlLedger.find({ CODE1: { $in: ordnos } }).lean() : Promise.resolve([]),
            ordnos.length ? MaOrder.find({ ORDNO: { $in: ordnos } }).lean() : Promise.resolve([]),
        ]);

        // ---- 5. Group related data per customer in JS (tiny dataset, cheap) ----
        const groupBy = (records: any[], key: string) => {
            const map = new Map<string, any[]>();
            for (const rec of records) {
                const k = rec[key];
                if (!k) continue;
                if (!map.has(k)) map.set(k, []);
                map.get(k)!.push(rec);
            }
            return map;
        };

        const pendByOrd = groupBy(pendRecords as any[], "ORD");
        const ledgerByOrd = groupBy(ledgerRecords as any[], "CODE1");
        const maOrderByOrd = groupBy(maOrderRecords as any[], "ORDNO");

        const maxDate = (items: any[], field: string): string | null =>
            items.reduce((max: string | null, item) => {
                const v = item[field];
                if (!v) return max;
                if (!max || v > max) return v;
                return max;
            }, null);

        // First non-null value of `field` across a list of records (most recently
        // pushed record wins ties, since we don't have a reliable "latest" order
        // guarantee from find() without an explicit sort).
        const firstNonNull = (items: any[], field: string): string | null => {
            for (const item of items) {
                if (item[field] !== null && item[field] !== undefined && item[field] !== "") {
                    return item[field];
                }
            }
            return null;
        };

        const enrichedRows = rows.map((row: any) => {
            const pend = pendByOrd.get(row.ORDNO) || [];
            const ledger = ledgerByOrd.get(row.ORDNO) || [];
            const maOrder = maOrderByOrd.get(row.ORDNO) || [];

            const totalDebit = ledger.reduce((s, g) => s + (g.DEBIT || 0), 0);
            const totalCredit = ledger.reduce((s, g) => s + (g.CREDIT || 0), 0);

            return {
                ORDNO: row.ORDNO,
                SCODE: row.SCODE,
                CODEP: row.CODEP,
                PARNAM: row.PARNAM,
                CITY: row.CITY,

                // Order's own AREA/ROUT/DSM are usually null but not always — check
                // Order first, then fall back to Pend (AREA/ROUT) / GlLedger (DSM).
                AREA: row.AREA ?? firstNonNull(pend, "AREA"),
                ROUT: row.ROUT ?? firstNonNull(pend, "ROUT"),
                DSM: row.DSM ?? firstNonNull(ledger, "DSM"),

                STATUS: row.STATUS,
                BALANCE: row.BALANCE,
                DUEDAYS: row.DUEDAYS,
                PHONE1: row.PHONE1,
                PHONE2: row.PHONE2,
                GSTNO: row.GSTNO,
                DLNO: row.DLNO,

                outstandingAmount: pend.reduce((s, p) => s + (p.FINAL || 0), 0),
                pendingVouchers: pend.length,
                lastDueDate: maxDate(pend, "DDATE"),

                totalDebit,
                totalCredit,
                ledgerBalance: totalDebit - totalCredit,
                lastTransactionDate: maxDate(ledger, "DATE"),

                maOrderBalance: maOrder.reduce((s, m) => s + (m.BALANCE || 0), 0),
                maOrderCount: maOrder.length,
                lastMaOrderDate: maxDate(maOrder, "DATE"),
                maOrderForm: maOrder.length ? maOrder[maOrder.length - 1].FORM ?? null : null,
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