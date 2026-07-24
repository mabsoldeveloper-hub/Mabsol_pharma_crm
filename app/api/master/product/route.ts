import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import MrTerritory from "@/models/MrTerritory";
import { getCurrentUser } from "@/lib/auth";

// GET /api/master/product
//
// MR Territory Filtering Logic:
//   - If the logged-in user has ACTIVE MrTerritory records → they are an MR.
//     Only products whose GCODE matches one of their allowed company codes are returned.
//   - If no territory records exist → user is admin / non-MR → all products returned.
//
// Product ↔ Company link:
//   Product.GCODE  →  SaleType.SCODE  →  SaleType.SNAME (company name)
//   So "allowed company codes" = MrTerritory.companyCode values for this user.

export const dynamic = "force-dynamic";

export async function GET() {
    await connectDB();

    // ── Step 1: Determine MR territory restrictions ───────────────────────
    let allowedGCODEs: string[] | null = null; // null = no restriction (admin/non-MR)

    try {
        const user = await getCurrentUser();

        if (user) {
            // Find all ACTIVE territories for this user
            const territories = await MrTerritory.find(
                { userId: user._id, status: "Active" },
                { companyCode: 1 }
            );

            if (territories && territories.length > 0) {
                // User IS an MR with territory assignments
                const allowedCompanyCodes = Array.from(
                    new Set(
                        territories.map((t: any) =>
                            String(t.companyCode || "").trim()
                        )
                    )
                ).filter(Boolean);

                // Product.GCODE corresponds to SaleType.SCODE (company code)
                // So allowedGCODEs = allowedCompanyCodes (direct match)
                allowedGCODEs = allowedCompanyCodes;
            }
            // else: user has no territories → not an MR → show all products
        }
    } catch {
        // If session check fails, fall back to showing all products
        allowedGCODEs = null;
    }

    // ── Step 2: Build product query with optional GCODE filter ────────────
    const productFilter: any = {};
    if (allowedGCODEs !== null && allowedGCODEs.length > 0) {
        productFilter.GCODE = { $in: allowedGCODEs };
    } else if (allowedGCODEs !== null && allowedGCODEs.length === 0) {
        // MR is assigned but company codes couldn't be resolved → return nothing
        return NextResponse.json([]);
    }

    const products = await Product.find(productFilter).sort({ PRODUCT: 1 });

    // ── Step 3: Build enrichment maps from SaleType ───────────────────────
    const saleTypes = await SaleType.find(
        {},
        { SCODE: 1, SNAME: 1, SGCODE: 1 }
    );

    // SCODE -> SNAME map (company name lookup by Product.GCODE)
    const companyMap = new Map<string, string>();

    // SCODE -> SNAME map, ONLY for HSN rows (Product.GCODE6 join)
    const hsnMap = new Map<string, string>();

    saleTypes.forEach((item: any) => {
        if (!item.SCODE) return;
        const code = String(item.SCODE).trim();
        companyMap.set(code, item.SNAME);

        // Only rows tagged as commodity codes hold an actual HSN value
        if (String(item.SGCODE || "").trim() === "COMMCD") {
            hsnMap.set(code, item.SNAME);
        }
    });

    // ── Step 4: Enrich products with derived fields ───────────────────────
    const result = products.map((p: any) => {
        const gcode  = p.GCODE  ? String(p.GCODE).trim()  : "";
        const gcode6 = p.GCODE6 ? String(p.GCODE6).trim() : "";
        const obj = p.toObject();

        const ratef = Number(obj.RATEF   || 0);
        const prate = Number(obj.PRATE   || 0);
        const mrp   = Number(obj.MRP     || 0);
        const bal   = Number(obj.BALANCE || 0);

        const marginPct  = ratef > 0 && prate > 0
            ? Math.round(((ratef - prate) / ratef) * 100) : 0;
        const stockValue = bal > 0 ? Math.round(bal * (ratef || mrp)) : 0;

        return {
            ...obj,
            companyName: companyMap.get(gcode)  || "",
            HSN:         hsnMap.get(gcode6)     || "",
            marginPct,
            stockValue,
        };
    });

    return NextResponse.json(result);
}