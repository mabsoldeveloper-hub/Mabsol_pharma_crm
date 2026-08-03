import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const fyRange = await getFYDateRange(searchParams);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const partyCode = searchParams.get("partyCode") || "";
        const area = searchParams.get("area") || "";
        const route = searchParams.get("route") || "";
        const company = searchParams.get("company") || "";
        const division = searchParams.get("division") || "";
        const salesman = searchParams.get("salesman") || "";
        const minAmount = searchParams.get("minAmount") ? parseFloat(searchParams.get("minAmount")!) : null;
        const maxAmount = searchParams.get("maxAmount") ? parseFloat(searchParams.get("maxAmount")!) : null;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));

        const restriction = await getMrTerritoryRestriction();

        // 1. Fetch party map (Customer + Order)
        const [orders, mainCustomers] = await Promise.all([
            Order.find(combineFilters(companyVfpMatch), {
                ORDNO: 1, CODEP: 1, SCODE: 1, PARNAM: 1, NAME: 1, CITY: 1,
                AREA: 1, ROUT: 1, ROUTE: 1, COMPANY: 1, DIVISION: 1, DSM: 1,
                SALESMAN: 1, PHONE: 1, MOBILE: 1, GSTIN: 1, GST: 1,
            }).lean(),
            Customer.find(combineFilters(companyVfpMatch), {
                ORDNO: 1, CODEP: 1, SCODE: 1, PARNAM: 1, NAME: 1, CITY: 1,
                AREA: 1, ROUT: 1, ROUTE: 1, COMPANY: 1, DIVISION: 1, DSM: 1,
                SALESMAN: 1, PHONE: 1, MOBILE: 1, GSTIN: 1, GST: 1, GSTNO: 1,
            }).lean(),
        ]);

        const partyMap = new Map<string, any>();
        const addParty = (item: any) => {
            const partyObj = {
                name: item.PARNAM || item.NAME || "",
                city: item.CITY || "",
                area: item.AREA || "",
                route: item.ROUT || item.ROUTE || "",
                company: item.COMPANY || "",
                division: item.DIVISION || "",
                salesman: item.DSM || item.SALESMAN || "",
                phone: item.PHONE || item.MOBILE || "",
                gstin: item.GSTIN || item.GST || item.GSTNO || "",
            };
            [item.ORDNO, item.CODEP, item.SCODE].forEach((k) => {
                if (k) {
                    const key = String(k).trim().toUpperCase();
                    if (key && !partyMap.has(key)) partyMap.set(key, partyObj);
                }
            });
        };
        orders.forEach(addParty);
        mainCustomers.forEach(addParty);

        // Collect distinct filter options
        const areaSet = new Set<string>();
        const routeSet = new Set<string>();
        const companySet = new Set<string>();
        const divisionSet = new Set<string>();
        const salesmanSet = new Set<string>();
        partyMap.forEach((val) => {
            if (val.area) areaSet.add(val.area);
            if (val.route) routeSet.add(val.route);
            if (val.company) companySet.add(val.company);
            if (val.division) divisionSet.add(val.division);
            if (val.salesman) salesmanSet.add(val.salesman);
        });

        // 2. Build filter: Debit Notes ONLY (DN-prefix VCN = Purchase Returns to Supplier)
        // In Marg ERP: TYPE="B" covers both CN and DN. We isolate DN here.
        const debitNoteTypeFilter = combineFilters(
            {
                $or: [
                    // Explicit Debit Note VCN patterns
                    { VCN: { $regex: "^DN", $options: "i" } },
                    { TYPE: "DR" },     // Debit Note type if present
                    { INVTYPE: "DN" },
                    { INVTYPE: "DR" },
                    // TYPE=B with DN prefix (main Marg pattern)
                    { TYPE: "B", VCN: { $regex: "^DN", $options: "i" } },
                ],
            },
            // Safety: only records where VCN starts with DN
            { VCN: { $regex: "^DN", $options: "i" } }
        );

        let filter: any = combineFilters(companyVfpMatch, debitNoteTypeFilter);

        if (restriction.isMrRestricted && restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
            filter = combineFilters(filter, { CODEP: { $in: restriction.allowedOrdnos } });
        }

        const effStart = startDate || fyRange.startDate;
        const effEnd = endDate || fyRange.endDate;

        if (!fyRange.isAll && (effStart || effEnd)) {
            const dateQuery = buildFYDateQuery("DATE", effStart, effEnd);
            filter = combineFilters(filter, dateQuery);
        }

        if (minAmount !== null || maxAmount !== null) {
            const amtFilter: any = {};
            if (minAmount !== null) amtFilter.$gte = minAmount;
            if (maxAmount !== null) amtFilter.$lte = maxAmount;
            filter = combineFilters(filter, { FINAL: amtFilter });
        }

        if (partyCode) {
            const isNum = !isNaN(Number(partyCode));
            const pConds: any[] = [{ CODEP: partyCode }, { CODE: partyCode }];
            if (isNum) {
                pConds.push({ CODEP: Number(partyCode) });
                pConds.push({ CODE: Number(partyCode) });
            }
            filter = combineFilters(filter, { $or: pConds });
        }

        if (search) {
            const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
            filter = combineFilters(filter, {
                $or: [
                    { VCN: searchRegex },
                    { VOUCHER: searchRegex },
                    { REMARKS: searchRegex },
                    { CODEP: searchRegex },
                ],
            });
        }

        if (area || route || company || division || salesman) {
            const matchedCodes: string[] = [];
            partyMap.forEach((info, code) => {
                if (area && info.area.toLowerCase() !== area.toLowerCase()) return;
                if (route && info.route.toLowerCase() !== route.toLowerCase()) return;
                if (company && info.company.toLowerCase() !== company.toLowerCase()) return;
                if (division && info.division.toLowerCase() !== division.toLowerCase()) return;
                if (salesman && info.salesman.toLowerCase() !== salesman.toLowerCase()) return;
                matchedCodes.push(code);
            });
            filter = combineFilters(filter, {
                $or: [{ CODEP: { $in: matchedCodes } }, { CODE: { $in: matchedCodes } }],
            });
        }

        // 3. Query
        const [allDocs, totalCount, docs] = await Promise.all([
            SalesMdis.find(filter, { VCN: 1, VOUCHER: 1, FINAL: 1, AMOUNTT: 1, TAXAMO: 1 }).lean(),
            SalesMdis.countDocuments(filter),
            SalesMdis.find(filter)
                .sort({ DATE: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);

        const totalDebitNoteAmount = allDocs.reduce((sum: number, d: any) => sum + Number(d.FINAL || d.AMOUNTT || 0), 0);
        const totalTaxableAmount = allDocs.reduce((sum: number, d: any) => sum + Number(d.AMOUNTT || 0), 0);
        const totalTaxAmount = allDocs.reduce((sum: number, d: any) => sum + Number(d.TAXAMO || 0), 0);
        const avgDebitNoteAmount = totalCount > 0 ? Math.round(totalDebitNoteAmount / totalCount) : 0;

        // 4. Fetch line items for page records
        const pageVcns: string[] = [];
        docs.forEach((d: any) => {
            if (d.VCN) pageVcns.push(String(d.VCN).trim());
            if (d.VOUCHER) pageVcns.push(String(d.VOUCHER).trim());
        });

        const lineItems = pageVcns.length > 0
            ? await SalesDis.find({
                $or: [{ VCN: { $in: pageVcns } }, { VOUCHER: { $in: pageVcns } }],
            }).lean()
            : [];

        let totalItemsQty = 0;
        const itemsByVcn = new Map<string, any[]>();
        lineItems.forEach((item: any) => {
            const v = String(item.VCN || item.VOUCHER || "").trim();
            if (!v) return;
            const q = Number(item.QTY || item.QUANTITY || 1);
            totalItemsQty += q;
            if (!itemsByVcn.has(v)) itemsByVcn.set(v, []);
            itemsByVcn.get(v)!.push({
                code: item.CODE || item.CODEP || "",
                product: item.PRODUCT || item.NAME || "Product",
                batchNo: item.BATCHNO || item.BATCH || "N/A",
                exp: item.EXP || "",
                qty: q,
                rate: Number(item.RATE || 0),
                taxP: Number(item.TAX || 0),
                disP: Number(item.DISCOUNT || item.DISP || 0),
                total: Number(item.TOTAL || item.AMMMOUNT || 0),
            });
        });

        const rows = docs.map((d: any) => {
            const pCode = String(d.CODEP || d.CODE || "").trim();
            const pInfo = partyMap.get(pCode) || {
                name: pCode || "N/A", city: "", area: "", route: "",
                company: "", division: "", salesman: "", phone: "", gstin: "",
            };
            const vcnStr = String(d.VCN || d.VOUCHER || "N/A").trim();
            const itemsList = itemsByVcn.get(vcnStr) || [];
            const vcnItemsQty = itemsList.reduce((sum, i) => sum + i.qty, 0);
            return {
                id: d._id.toString(),
                vcn: vcnStr,
                date: d.DATE || "N/A",
                originalVcn: d.ORIGINAL_VCN || "—",
                partyCode: pCode,
                partyName: pInfo.name,
                city: pInfo.city,
                area: pInfo.area,
                route: pInfo.route,
                company: pInfo.company,
                division: pInfo.division,
                salesman: pInfo.salesman,
                phone: pInfo.phone,
                gstin: pInfo.gstin,
                taxableAmount: Number(d.AMOUNTT || 0),
                taxAmount: Number(d.TAXAMO || 0),
                finalAmount: Number(d.FINAL || d.AMOUNTT || 0),
                remarks: d.REMARKS || d.REASON || "",
                itemsCount: itemsList.length,
                totalQty: vcnItemsQty,
                items: itemsList,
            };
        });

        return NextResponse.json({
            success: true,
            summary: {
                totalCount,
                totalDebitNoteAmount,
                totalTaxableAmount,
                totalTaxAmount,
                totalItemsQty,
                avgDebitNoteAmount,
            },
            filterOptions: {
                areas: Array.from(areaSet).sort(),
                routes: Array.from(routeSet).sort(),
                companies: Array.from(companySet).sort(),
                divisions: Array.from(divisionSet).sort(),
                salesmen: Array.from(salesmanSet).sort(),
            },
            rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
        });

    } catch (error: any) {
        console.error("Debit Note Report API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch debit note report" },
            { status: 500 }
        );
    }
}
