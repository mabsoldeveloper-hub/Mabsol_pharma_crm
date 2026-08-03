import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);
    const restriction = await getMrTerritoryRestriction();

    // 1. Fetch Customers / Suppliers (Sundry Creditors starting with ACGROUP 'D' or all party records)
    const rawCustomers = await Customer.find(combineFilters(companyVfpMatch)).sort({ PARNAM: 1 }).lean();

    const suppliers = rawCustomers.map((c: any) => {
      const code = String(c.ORDNO || c.CODEP || c.SCODE || c.CODE || "").trim();
      const name = String(c.PARNAM || c.NAME || code).trim();
      const gst = String(c.GSTIN || c.GSTNO || c.GST || "").trim();
      const phone = String(c.PHONE || c.MOBILE || "").trim();
      const city = String(c.CITY || c.AREA || "").trim();
      const address = String(c.ADDRESS || c.ADD1 || c.ADD2 || "").trim();
      const acGroup = String(c.ACGROUP || c.SCODE || "").trim();

      return {
        id: c._id ? String(c._id) : code,
        code,
        name,
        gst,
        phone,
        city,
        address,
        acGroup,
        isCreditor: acGroup.toUpperCase().startsWith("D"),
      };
    });

    // Sort creditors to top
    suppliers.sort((a, b) => (b.isCreditor ? 1 : 0) - (a.isCreditor ? 1 : 0));

    // 2. Fetch HSN Master Map from SaleType (SGCODE === "COMMCD")
    const commcdTypes = await SaleType.find({ SGCODE: "COMMCD" }, { SCODE: 1, SNAME: 1 }).lean();
    const hsnMap = new Map<string, string>();
    commcdTypes.forEach((st: any) => {
      const code = String(st.SCODE || "").trim();
      const rawName = String(st.SNAME || "").trim();
      const hsnToken = rawName.split(/\s+/)[0] || rawName;
      if (code) hsnMap.set(code, hsnToken);
      if (rawName) hsnMap.set(rawName, hsnToken);
    });

    // 3. Fetch Products (identical to /api/products used on /dashboard/inventory/products)
    let productFilter: any = combineFilters(companyVfpMatch);
    if (restriction.isMrRestricted && restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
      productFilter = combineFilters(companyVfpMatch, {
        GCODE: {
          $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes],
        },
      });
    }

    const [rawProducts, saleTypes] = await Promise.all([
      Product.find(productFilter).sort({ PRODUCT: 1, NAME: 1, PNAME: 1 }).lean(),
      SaleType.find({}, { SCODE: 1, SNAME: 1 }).lean(),
    ]);

    const companyMap = new Map();
    saleTypes.forEach((st: any) => {
      companyMap.set(String(st.SCODE).trim(), String(st.SNAME).trim());
    });

    const products = rawProducts.map((p: any) => {
      const code = String(p.CODE || p.CODEP || p.ORDNO || "").trim();
      const name = String(p.PRODUCT || p.NAME || p.PNAME || p.DESCRIPT || code).trim();
      
      const gcode6Str = String(p.GCODE6 || p.COMMCD || p.COMMODITY || "").trim();
      const rawHsn = String(p.HSN || p.HSNCODE || p.HSN_CODE || p.CODE6 || "").trim();

      // Resolve real HSN Code from Product record or SaleType COMMCD map
      let hsn = rawHsn || hsnMap.get(gcode6Str) || hsnMap.get(gcode6Str.toUpperCase()) || "";
      if (!hsn && gcode6Str && gcode6Str.length >= 4 && /^\d+$/.test(gcode6Str)) {
        hsn = gcode6Str;
      }
      if (!hsn) {
        hsn = "30049099"; // Standard pharma HSN default if unassigned
      }

      const purchaseRate = Number(p.PRATE || p.PURRATE || p.COST || p.RATE || 0);
      const mrp = Number(p.MRP || p.RRP || p.SELRATE || 0);
      const gstPercent = Number(p.IGST || p.GST || p.TAX || p.TAXPERCENT || 12);
      const unit = String(p.PACK || p.UNIT || "Box").trim();

      const gcodeStr = String(p.GCODE || "").trim();
      const companyName = companyMap.get(gcodeStr) || (p.COMPANY && p.COMPANY !== "ZZZZZZ 144" ? p.COMPANY : "");

      return {
        id: p._id ? String(p._id) : code,
        code,
        name,
        hsn,
        purchaseRate,
        mrp,
        gstPercent,
        unit,
        companyName,
      };
    });

    return NextResponse.json({
      success: true,
      suppliersCount: suppliers.length,
      productsCount: products.length,
      suppliers,
      products,
    });
  } catch (error: any) {
    console.error("Master Options Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch master options" },
      { status: 500 }
    );
  }
}
