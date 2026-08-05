import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { ProductBatch, Product } from "@/models/StockModels";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

function parseExpiryDate(expRaw: any): Date | null {
    if (!expRaw) return null;
    const expStr = String(expRaw).trim();
    if (!expStr) return null;

    // ISO format: YYYY-MM-DD or YYYY-MM
    if (expStr.includes("-")) {
        const parts = expStr.split("-");
        if (parts.length >= 2) {
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            const d = parts[2] ? Number(parts[2]) : 28;
            if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
                return new Date(y, m - 1, d);
            }
        }
        const parsed = new Date(expStr);
        if (!isNaN(parsed.getTime())) return parsed;
    }

    // MM/YY or MM/YYYY
    if (expStr.includes("/")) {
        const parts = expStr.split("/");
        const m = Number(parts[0]);
        let y = Number(parts[1]);
        if (!isNaN(m) && !isNaN(y)) {
            if (parts[1]?.length === 2) y += 2000;
            if (m >= 1 && m <= 12) {
                return new Date(y, m, 0); // Last day of month
            }
        }
    }

    // MMYY or MMYYYY
    if (/^\d{4,6}$/.test(expStr)) {
        const m = Number(expStr.slice(0, 2));
        let y = Number(expStr.slice(2));
        if (expStr.length === 4) y += 2000;
        if (m >= 1 && m <= 12) {
            return new Date(y, m, 0);
        }
    }

    return null;
}

export async function GET(req: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);

        // 1. Fetch Batches & Products efficiently from StockModels (probat & pro collections)
        let rawBatches: any[] = [];
        let rawProducts: any[] = [];

        const batchQueryFilter = combineFilters({ BALANCE: { $gt: 0 } }, companyVfpMatch);
        const productQueryFilter = combineFilters({ BALANCE: { $gt: 0 } }, companyVfpMatch);

        try {
            const [bDocs, pDocs] = await Promise.all([
                ProductBatch.find(batchQueryFilter).limit(3000).lean(),
                Product.find(productQueryFilter).limit(3000).lean(),
            ]);
            rawBatches = bDocs || [];
            rawProducts = pDocs || [];
        } catch (e) {
            console.error("StockModels batch query error:", e);
        }

        // Fallback if company-specific filter returned 0 batches
        if (rawBatches.length === 0) {
            try {
                const [bDocs, pDocs] = await Promise.all([
                    ProductBatch.find({ BALANCE: { $gt: 0 } }).limit(2000).lean(),
                    Product.find({ BALANCE: { $gt: 0 } }).limit(2000).lean(),
                ]);
                rawBatches = bDocs || [];
                rawProducts = pDocs || [];
            } catch (e) {
                console.error("StockModels fallback query error:", e);
            }
        }

        // Build product master lookup map by CODE
        const productMap = new Map<string, any>();
        rawProducts.forEach((p: any) => {
            const code = String(p.CODE || p._id || "").trim();
            if (code) productMap.set(code, p);
        });

        // 2. Aggregate & classify batch risk data
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const batchList: any[] = [];
        const processedKeys = new Set<string>();

        let totalInventoryCostValue = 0;
        let totalInventoryMRPValue = 0;
        let expiredLossCostValue = 0;
        let critical030CostValue = 0;
        let warning3190CostValue = 0;
        let deadstockCostValue = 0;

        const allItems = rawBatches.length > 0 ? rawBatches : rawProducts;

        allItems.forEach((b: any) => {
            const pCode = String(b.CODE || b.PROCD || b.productCode || "").trim();
            const product = productMap.get(pCode);

            const productName =
                b.PRODUCT ||
                b.BILLNAME ||
                b.PRONAM ||
                product?.PRODUCT ||
                product?.BILLNAME ||
                product?.name ||
                (pCode ? `Product ${pCode}` : "Pharma Item");

            const batchNo = String(b.BATCHNO || b.BATNO || b.batchNo || "BATCH-01").trim();
            const qty = Math.max(0, Number(b.BALANCE ?? b.QTY ?? b.BALQTY ?? b.OPENING ?? 0));

            // Rates
            const cost = Number(b.LPRATE ?? b.PRATE ?? b.COST ?? product?.LPRATE ?? product?.PRATE ?? product?.MRP ?? 100);
            const mrp = Number(b.MRP ?? product?.MRP ?? Math.round(cost * 1.35));

            const stockCostValue = Math.round(qty * cost);
            const stockMRPValue = Math.round(qty * mrp);

            totalInventoryCostValue += stockCostValue;
            totalInventoryMRPValue += stockMRPValue;

            // Expiry Date Resolution
            const expRaw = b.EXP || b.EXPDT || b.expiryDate || b.exp;
            let expDate = parseExpiryDate(expRaw);

            let daysLeft = 180;
            let expiryDateStr = "2026-12";

            if (expDate) {
                const diffTime = expDate.getTime() - now.getTime();
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const year = expDate.getFullYear();
                const month = String(expDate.getMonth() + 1).padStart(2, "0");
                const day = String(expDate.getDate()).padStart(2, "0");
                expiryDateStr = `${year}-${month}-${day}`;
            } else if (typeof expRaw === "string" && expRaw.trim()) {
                expiryDateStr = expRaw.trim();
            }

            // Categories
            let category: "expired" | "critical_30" | "warning_90" | "safe_180" | "safe_normal" = "safe_normal";

            if (daysLeft <= 0) {
                category = "expired";
                expiredLossCostValue += stockCostValue;
            } else if (daysLeft <= 30) {
                category = "critical_30";
                critical030CostValue += stockCostValue;
            } else if (daysLeft <= 90) {
                category = "warning_90";
                warning3190CostValue += stockCostValue;
            } else if (daysLeft <= 180) {
                category = "safe_180";
            }

            // Deadstock determination (no recent sales / stagnant inventory)
            const sales60 = Number(b.SALES_60D ?? b.SALES60 ?? b.ISSUEQTY ?? 0);
            const isDeadstock = daysLeft > 0 && (b.DEADSTOCK === true || b.isDeadstock === true || (daysLeft > 60 && sales60 === 0 && qty > 0));

            if (isDeadstock) {
                deadstockCostValue += stockCostValue;
            }

            const key = `${pCode}_${batchNo}_${b._id || ""}`;
            if (processedKeys.has(key)) return;
            processedKeys.add(key);

            batchList.push({
                batchId: b._id ? b._id.toString() : key,
                productCode: pCode || "PROD-01",
                productName,
                batchNo,
                expiryDateStr,
                daysLeft,
                qty,
                unitCost: Math.round(cost),
                unitSaleRate: Math.round(prate),
                unitMRP: Math.round(mrp),
                stockCostValue,
                stockMRPValue,
                category,
                isDeadstock,
                sales60Days: sales60,
                topDemandState: b.STATE ? { stateName: String(b.STATE), qty: Math.round(qty * 0.5) } : null,
            });
        });

        // Sort by risk criticality (expired first, then lowest daysLeft)
        batchList.sort((a, b) => a.daysLeft - b.daysLeft);

        return NextResponse.json({
            success: true,
            summary: {
                totalBatchesCount: batchList.length,
                totalInventoryCostValue,
                totalInventoryMRPValue,
                expiredLossCostValue,
                critical030CostValue,
                warning3190CostValue,
                deadstockCostValue,
            },
            batches: batchList,
        });
    } catch (error: any) {
        console.error("Batch Expiry Liquidator API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to load expiry liquidator data" },
            { status: 500 }
        );
    }
}
