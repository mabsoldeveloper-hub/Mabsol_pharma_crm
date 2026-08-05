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

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);

    // ── Step 1: Determine MR territory restrictions ───────────────────────
    let allowedGCODEs: string[] | null = null; // null = no restriction (admin/non-MR)

    try {
        const user = await getCurrentUser();

        if (user) {
            const roleName = String(user.roleId?.roleName || "").trim().toLowerCase();

            // Admin role users get FULL access to all products
            if (roleName.includes("admin")) {
                allowedGCODEs = null;
            } else {
                // Find all ACTIVE territories for this user
                const territories = await MrTerritory.find(
                    { userId: user._id, status: "Active" },
                    { companyCode: 1 }
                );

                if (territories && territories.length > 0) {
                    // Non-admin user with territory assignments → restrict to allowed company codes
                    const allowedCompanyCodes = Array.from(
                        new Set(
                            territories.map((t: any) =>
                                String(t.companyCode || "").trim()
                            )
                        )
                    ).filter(Boolean);

                    allowedGCODEs = allowedCompanyCodes;
                }
            }
        }

    } catch {
        // If session check fails, fall back to showing all products
        allowedGCODEs = null;
    }

    // ── Step 2: Build product query with optional GCODE filter ────────────
    let productFilter: any = combineFilters(companyVfpMatch);
    if (allowedGCODEs !== null && allowedGCODEs.length > 0) {
        productFilter = combineFilters(companyVfpMatch, { GCODE: { $in: allowedGCODEs } });
    }

    const conn = await connectDB();
    const db = conn?.connection?.db;

    let proDocs: any[] = [];
    try {
        if (db) {
            proDocs = await db.collection("vfp_new_folder_pro").find(productFilter).toArray();
            if (proDocs.length === 0) {
                proDocs = await db.collection("products").find(productFilter).toArray();
            }
        }
    } catch (e) {}

    if (proDocs.length === 0) {
        proDocs = await Product.find(productFilter).sort({ PRODUCT: 1 }).lean();
    }

    if (proDocs.length === 0 && db) {
        proDocs = await db.collection("vfp_new_folder_pro").find({}).limit(2000).toArray();
        if (proDocs.length === 0) {
            proDocs = await db.collection("products").find({}).limit(2000).toArray();
        }
    }

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
    const result = proDocs.map((p: any) => {
        const exactProductName = String(p.PRODUCT || p.BILLNAME || p.PNAME || p.NAME || p.DESCRIPT || "Unnamed Product").trim();
        const productCode = String(p.CODE || p.PCODE || p._id).trim();
        const gcode  = p.GCODE  ? String(p.GCODE).trim()  : (p.COMPANY || "");
        const gcode6 = p.GCODE6 ? String(p.GCODE6).trim() : "";
        const obj = typeof p.toObject === "function" ? p.toObject() : p;

        const ratef = Number(obj.RATEF || obj.RATE || 0);
        const prate = Number(obj.PRATE || obj.PURRATE || 0);
        const mrp   = Number(obj.MRP   || 0);
        const bal   = Number(obj.BALANCE !== undefined ? obj.BALANCE : obj.STOCK !== undefined ? obj.STOCK : obj.QTY || 0);

        const marginPct  = ratef > 0 && prate > 0
            ? Math.round(((ratef - prate) / ratef) * 100) : 0;
        const stockValue = bal > 0 ? Math.round(bal * (ratef || mrp)) : 0;

        return {
            ...obj,
            _id: String(obj._id),
            CODE: productCode,
            PRODUCT: exactProductName,
            NAME: exactProductName,
            MRP: mrp,
            PRATE: prate,
            RATEF: ratef,
            BALANCE: bal,
            IGST: Number(obj.IGST || obj.GST || 0),
            STATUS: obj.STATUS || "Y",
            companyName: companyMap.get(gcode) || (p.COMPANY && p.COMPANY !== "ZZZZZZ 144" ? p.COMPANY : gcode || "N/A"),
            HSN: hsnMap.get(gcode6) || "",
            marginPct,
            stockValue,
        };
    });

    return NextResponse.json(result);
}