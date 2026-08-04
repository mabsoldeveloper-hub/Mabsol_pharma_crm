import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import PurchaseBill from "@/models/PurchaseBill";
import Pendings from "@/models/Pendings";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);
    const restriction = await getMrTerritoryRestriction();

    const custProjection = {
      PARNAM: 1, NAME: 1, ORDNO: 1, CODEP: 1, SCODE: 1, CODE: 1,
      GSTIN: 1, GSTNO: 1, GST: 1, PHONE: 1, MOBILE: 1, CITY: 1,
      AREA: 1, ADDRESS: 1, ADD1: 1, ADD2: 1, ACGROUP: 1,
    };

    // 1. Fetch Customers / Suppliers (Sundry Creditors starting with ACGROUP 'D' or all party records)
    let rawCustomers = await Customer.find(combineFilters(companyVfpMatch), custProjection).lean();

    // Fallback: If company filter returned 0 customers, fetch all customers
    if (rawCustomers.length === 0) {
      rawCustomers = await Customer.find({}, custProjection).limit(2000).lean();
    }

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

    // Also collect distinct vendors from PurchaseBill records to ensure all active vendors are included
    const seenNames = new Set<string>();
    suppliers.forEach((s) => {
      if (s.name) seenNames.add(s.name.trim().toLowerCase());
    });

    try {
      const pbVendors = await PurchaseBill.find(
        {},
        { vendorId: 1, vendorCode: 1, vendorName: 1, vendorGst: 1, vendorPhone: 1, vendorCity: 1, vendorAddress: 1 }
      ).lean();

      for (const pb of pbVendors) {
        const vName = String(pb.vendorName || "").trim();
        if (vName && !seenNames.has(vName.toLowerCase())) {
          seenNames.add(vName.toLowerCase());
          suppliers.push({
            id: pb.vendorId ? String(pb.vendorId) : pb.vendorCode || vName,
            code: pb.vendorCode || "",
            name: vName,
            gst: pb.vendorGst || "",
            phone: pb.vendorPhone || "",
            city: pb.vendorCity || "",
            address: pb.vendorAddress || "",
            acGroup: "D",
            isCreditor: true,
          });
        }
      }
    } catch (e) {
      console.error("Error aggregating PurchaseBill vendors:", e);
    }

    // Sort creditors to top, then alphabetically
    suppliers.sort((a, b) => {
      if (a.isCreditor !== b.isCreditor) return b.isCreditor ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    const suppliersOnly = searchParams.get("suppliersOnly") === "true";
    if (suppliersOnly) {
      return NextResponse.json({
        success: true,
        suppliersCount: suppliers.length,
        productsCount: 0,
        suppliers,
        products: [],
      });
    }

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

    const prodProjection = {
      PRODUCT: 1, NAME: 1, PNAME: 1, DESCRIPT: 1, CODE: 1, CODEP: 1, ORDNO: 1,
      GCODE6: 1, COMMCD: 1, COMMODITY: 1, HSN: 1, HSNCODE: 1, HSN_CODE: 1, CODE6: 1,
      PRATE: 1, PURRATE: 1, COST: 1, RATE: 1, MRP: 1, RRP: 1, SELRATE: 1,
      IGST: 1, GST: 1, TAX: 1, TAXPERCENT: 1, PACK: 1, UNIT: 1, GCODE: 1, COMPANY: 1,
    };

    const [rawProducts, saleTypes] = await Promise.all([
      Product.find(productFilter, prodProjection).limit(3000).lean(),
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

    products.sort((a, b) => a.name.localeCompare(b.name));

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
