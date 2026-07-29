import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import Order from "@/models/Order";
import GlLedger from "@/models/GlLedger";
import SalesMdis from "@/models/SalesMdis";
import User from "@/models/User";
import Category from "@/models/Category";
import Division from "@/models/Division";

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Typo correction dictionary for common pharma terms & reports
const TYPO_MAP: Record<string, string> = {
  paracitamol: "Paracetamol",
  paracitamal: "Paracetamol",
  paracetmol: "Paracetamol",
  cipflo: "Ciprofloxacin",
  cipro: "Ciprofloxacin",
  azithral: "Azithromycin",
  azithro: "Azithromycin",
  pantop: "Pantoprazole",
  amoxi: "Amoxicillin",
  amox: "Amoxicillin",
  dlo: "Dolo 650",
  gstr: "GSTR-1",
  gst: "GSTR-1",
  ledgr: "Customer Ledger",
  ledg: "Customer Ledger",
  cust: "Customer Master",
  stock: "Current Stock",
  exp: "Near Expiry",
  expiry: "Near Expiry",
  targt: "Target vs Actual",
};

// Navigation items definition
const APP_PAGES = [
  { title: "Dashboard Overview", category: "Navigation", path: "/dashboard", keywords: ["home", "analytics", "dashboard", "kpi", "summary"], icon: "layout-dashboard" },
  { title: "Product Master & Stock Report", category: "Navigation", path: "/dashboard/reports/product", keywords: ["products", "stock", "inventory", "mrp", "rate", "batches"], icon: "package" },
  { title: "Current Stock Inventory", category: "Navigation", path: "/dashboard/reports/product?view=stock", keywords: ["current stock", "available stock", "godown", "warehouse"], icon: "boxes" },
  { title: "Customer Master & Ledgers", category: "Navigation", path: "/dashboard/reports/customer", keywords: ["customers", "parties", "ledger", "dealers", "clients"], icon: "users" },
  { title: "Outstanding Receivables Report", category: "Navigation", path: "/dashboard/reports/outstanding", keywords: ["outstanding", "pending", "due", "receivables", "credit"], icon: "clock" },
  { title: "Sales Receipt Report", category: "Navigation", path: "/dashboard/reports/sales-receipt", keywords: ["sales receipt", "vouchers", "payment", "collection"], icon: "receipt" },
  { title: "Sales Return Report", category: "Navigation", path: "/dashboard/reports/sales-return", keywords: ["sales return", "credit note", "return", "refund"], icon: "undo" },
  { title: "GSTR-1 GST Tax Report", category: "Navigation", path: "/dashboard/gst-reports/gstr1", keywords: ["gst", "gstr1", "gstr-1", "tax", "b2b", "hsn", "export excel", "gst-reports"], icon: "file-spreadsheet" },
  { title: "Target vs Actual Sales", category: "Navigation", path: "/dashboard/reports/target-vs-actual", keywords: ["target", "actual", "achievement", "mr target", "kpi"], icon: "target" },
  { title: "MR Customer Assignment", category: "Navigation", path: "/dashboard/mr-customer-assignment", keywords: ["mr assignment", "assign customer", "territory mapping"], icon: "user-plus" },
  { title: "MR Reporting (DCR / Call Logs)", category: "Navigation", path: "/dashboard/mr-reporting", keywords: ["dcr", "daily call report", "mr log", "field visit"], icon: "clipboard-list" },
  { title: "MR Territory Management", category: "Navigation", path: "/dashboard/mr-territory", keywords: ["territory", "hq", "headquarter", "zone", "region"], icon: "map-pin" },
  { title: "Sales Hierarchy & Organization", category: "Navigation", path: "/dashboard/sales-hierarchy", keywords: ["hierarchy", "mr", "asm", "rsm", "zsm", "team"], icon: "network" },
  { title: "Targets Master", category: "Navigation", path: "/dashboard/targets", keywords: ["targets", "monthly target", "quarterly target", "quota"], icon: "trophy" },
  { title: "User Permissions", category: "Navigation", path: "/dashboard/user-permissions", keywords: ["user permission", "access control", "privileges"], icon: "shield-check" },
  { title: "Role Permissions", category: "Navigation", path: "/dashboard/role-permissions", keywords: ["role permission", "admin", "manager"], icon: "lock" },
  { title: "Company Settings", category: "Navigation", path: "/dashboard/company-settings", keywords: ["company settings", "profile", "gstin", "address"], icon: "building" },
  { title: "Division Master", category: "Navigation", path: "/dashboard/division-master", keywords: ["division", "pharma division"], icon: "layers" },
  { title: "Sub-Division Master", category: "Navigation", path: "/dashboard/sub-division-master", keywords: ["sub division", "brand line"], icon: "git-branch" },
  { title: "Category Master", category: "Navigation", path: "/dashboard/category-master", keywords: ["category", "group", "product group"], icon: "tag" },
  { title: "Company Master", category: "Navigation", path: "/dashboard/company-master", keywords: ["company master", "manufacturers"], icon: "factory" },
  { title: "VFP Config & Sync Center", category: "Navigation", path: "/dashboard/vfp-config", keywords: ["vfp", "sync", "marg", "dbf", "import"], icon: "refresh-cw" },
  { title: "Financial Year Settings", category: "Navigation", path: "/dashboard/financial-year", keywords: ["financial year", "fy", "year"], icon: "calendar" },
  { title: "My Profile", category: "Navigation", path: "/dashboard/profile", keywords: ["profile", "account", "user info", "avatar"], icon: "user" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawQuery = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || 30), 60);

    const conn = await dbConnect();
    const db = conn.connection.db;

    // Handle empty query: Return DYNAMIC Database Trending Items (Real Products, Customers, Reports)
    if (!rawQuery || rawQuery.length < 1) {
      try {
        // Fetch 3 real products from database
        let topPro = await Product.find({ PRODUCT: { $exists: true, $ne: "" } }).limit(3).lean();
        if ((!topPro || topPro.length === 0) && db) {
          topPro = await db.collection("pro").find({ PRODUCT: { $exists: true, $ne: "" } }).limit(3).toArray();
        }

        // Fetch 3 real customers from database
        let topCust = await Order.find({ PARNAM: { $exists: true, $ne: "" } }).limit(3).lean();
        if ((!topCust || topCust.length === 0) && db) {
          topCust = await db.collection("order").find({ PARNAM: { $exists: true, $ne: "" } }).limit(3).toArray();
        }

        const dynamicTrending: any[] = [];

        // Add real products
        (topPro || []).forEach((p: any) => {
          dynamicTrending.push({
            label: p.PRODUCT || p.BILLNAME || `Product ${p.CODE}`,
            category: "Database Product 📦",
            query: p.PRODUCT || String(p.CODE),
            actionUrl: `/dashboard/reports/product?search=${encodeURIComponent(p.PRODUCT || p.CODE || "")}`,
            type: "product",
          });
        });

        // Add real customers
        (topCust || []).forEach((c: any) => {
          dynamicTrending.push({
            label: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
            category: c.CITY ? `Party (${c.CITY}) 👥` : "Customer Party 👥",
            query: c.PARNAM || String(c.CODEP),
            actionUrl: `/dashboard/reports/customer?search=${encodeURIComponent(c.PARNAM || c.CODEP || "")}`,
            type: "customer",
          });
        });

        // Add core report pages
        dynamicTrending.push(
          { label: "GSTR-1 GST Report", category: "Tax Report 📄", query: "GSTR-1", actionUrl: "/dashboard/gst-reports/gstr1", type: "navigation" },
          { label: "Current Stock Inventory", category: "Stock Report 📦", query: "Current Stock", actionUrl: "/dashboard/reports/product?view=stock", type: "navigation" },
          { label: "Outstanding Receivables", category: "Finance Report 💰", query: "Outstanding", actionUrl: "/dashboard/reports/outstanding", type: "navigation" },
          { label: "Target vs Actual Sales", category: "MR Performance 🎯", query: "Target", actionUrl: "/dashboard/reports/target-vs-actual", type: "navigation" }
        );

        return NextResponse.json({
          success: true,
          query: "",
          didYouMean: null,
          totalResults: 0,
          trending: dynamicTrending,
          results: {
            products: [],
            customers: [],
            vouchers: [],
            users: [],
            navigation: [],
          },
        });
      } catch (err) {
        console.error("Dynamic trending fetch error:", err);
      }
    }

    // E-Commerce style filters & sorting
    const inStockOnly = searchParams.get("inStock") === "true";
    const nearExpiryOnly = searchParams.get("nearExpiry") === "true";
    const highBalanceOnly = searchParams.get("highBalance") === "true";
    const sortBy = searchParams.get("sortBy") || "relevance";

    // Typo check ("Did You Mean?")
    const lowerQuery = rawQuery.toLowerCase();
    const suggestedQuery = TYPO_MAP[lowerQuery] || null;
    const query = suggestedQuery || rawQuery;

    const regex = new RegExp(escapeRegex(query), "i");
    const isNumeric = !isNaN(Number(query));
    const queryNumber = isNumeric ? Number(query) : null;

    // Run parallel searches across database
    const [productsRes, customersRes, vouchersRes, usersRes, navRes] = await Promise.all([
      // 1. PRODUCTS & STOCK SEARCH
      (category === "all" || category === "products")
        ? (async () => {
            try {
              const productFilter: any = {
                $or: [
                  { PRODUCT: regex },
                  { BILLNAME: regex },
                  { PACKING: regex },
                  { GCODE: regex },
                  { RACKNO: regex },
                  { COMPOSITION: regex },
                ],
              };
              if (queryNumber !== null) {
                productFilter.$or.push({ CODE: queryNumber });
              }

              let proDocs = await Product.find(productFilter).limit(15).lean();
              if ((!proDocs || proDocs.length === 0) && db) {
                proDocs = await db.collection("pro").find(productFilter).limit(15).toArray();
              }

              // Enrich with batch stock count & batch numbers
              const productCodes = proDocs.map((p: any) => p.CODE).filter(Boolean);
              let batchesByCode: Record<string | number, any[]> = {};

              if (productCodes.length > 0) {
                let batchDocs = await ProductBatch.find({ CODE: { $in: productCodes } }).lean();
                if ((!batchDocs || batchDocs.length === 0) && db) {
                  batchDocs = await db.collection("probat").find({ CODE: { $in: productCodes } }).toArray();
                }

                batchDocs.forEach((b: any) => {
                  if (!batchesByCode[b.CODE]) batchesByCode[b.CODE] = [];
                  batchesByCode[b.CODE].push(b);
                });
              }

              let mappedProducts = proDocs.map((p: any) => {
                const pBatches = batchesByCode[p.CODE] || [];
                const totalBatchQty = pBatches.reduce((acc, b) => acc + (Number(b.BALANCE || b.QTY) || 0), 0);
                const currentStock = p.BALANCE !== undefined && p.BALANCE !== null ? Number(p.BALANCE) : totalBatchQty;
                const stockValue = currentStock * (Number(p.PRATE) || Number(p.MRP) || 0);

                // Near expiry check (< 90 days)
                const ninetyDaysLater = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
                const hasNearExpiryBatch = pBatches.some((b) => b.EXP && b.EXP <= ninetyDaysLater);

                return {
                  id: `prod_${p._id || p.CODE}`,
                  type: "product",
                  category: "Products & Stock",
                  title: p.PRODUCT || p.BILLNAME || `Product #${p.CODE}`,
                  subtitle: `Code: ${p.CODE || "N/A"} | Pack: ${p.PACKING || "Std"} | Mfg/Co: ${p.GCODE || "General"}`,
                  details: {
                    productCode: p.CODE,
                    productName: p.PRODUCT,
                    billName: p.BILLNAME,
                    packing: p.PACKING,
                    groupCode: p.GCODE,
                    rackNo: p.RACKNO,
                    mrp: p.MRP ? `₹${p.MRP}` : "N/A",
                    saleRate: p.PRATE ? `₹${p.PRATE}` : "N/A",
                    purchaseRate: p.LPRATE ? `₹${p.LPRATE}` : "N/A",
                    currentStock: currentStock,
                    stockValue: `₹${stockValue.toLocaleString("en-IN")}`,
                    batchCount: pBatches.length,
                    hasNearExpiry: hasNearExpiryBatch,
                    batches: pBatches.slice(0, 10).map((b: any) => ({
                      batchNo: b.BATCHNO || "N/A",
                      exp: b.EXP || "N/A",
                      qty: b.BALANCE || b.QTY || 0,
                      mrp: b.MRP ? `₹${b.MRP}` : "N/A",
                      rate: b.PRATE ? `₹${b.PRATE}` : "N/A",
                    })),
                  },
                  badges: [
                    {
                      label: currentStock > 0 ? `In Stock: ${currentStock}` : "Out of Stock ⚠️",
                      color: currentStock > 0 ? "emerald" : "rose",
                    },
                    p.MRP ? { label: `MRP: ₹${p.MRP}`, color: "blue" } : null,
                    p.PRATE ? { label: `Rate: ₹${p.PRATE}`, color: "indigo" } : null,
                    hasNearExpiryBatch ? { label: "Near Expiry ⏳", color: "amber" } : null,
                  ].filter(Boolean),
                  actionUrl: `/dashboard/reports/product?search=${encodeURIComponent(p.PRODUCT || p.CODE || "")}`,
                  raw: p,
                };
              });

              // Apply E-Commerce filters
              if (inStockOnly) {
                mappedProducts = mappedProducts.filter((p) => p.details.currentStock > 0);
              }

              if (nearExpiryOnly) {
                mappedProducts = mappedProducts.filter((p) => p.details.hasNearExpiry);
              }

              // Apply Sorting
              if (sortBy === "stockHigh") {
                mappedProducts.sort((a, b) => b.details.currentStock - a.details.currentStock);
              } else if (sortBy === "priceHigh") {
                mappedProducts.sort((a, b) => (parseFloat(b.raw.MRP) || 0) - (parseFloat(a.raw.MRP) || 0));
              } else if (sortBy === "priceLow") {
                mappedProducts.sort((a, b) => (parseFloat(a.raw.MRP) || 0) - (parseFloat(b.raw.MRP) || 0));
              } else if (sortBy === "name") {
                mappedProducts.sort((a, b) => a.title.localeCompare(b.title));
              }

              return mappedProducts.slice(0, limit);
            } catch (err) {
              console.error("Global search products error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 2. CUSTOMERS & PARTIES SEARCH
      (category === "all" || category === "customers")
        ? (async () => {
            try {
              const customerFilter: any = {
                $or: [
                  { PARNAM: regex },
                  { MAILNAM: regex },
                  { CODEP: regex },
                  { CITY: regex },
                  { GSTNO: regex },
                  { PHONE1: regex },
                  { CODER: regex },
                ],
              };

              let custDocs = await Order.find(customerFilter).limit(15).lean();
              if ((!custDocs || custDocs.length === 0) && db) {
                custDocs = await db.collection("order").find(customerFilter).limit(15).toArray();
              }

              let mappedCustomers = custDocs.map((c: any) => {
                const balance = Number(c.BALANCE || 0);
                const isDebit = balance > 0;

                return {
                  id: `cust_${c._id || c.CODEP}`,
                  type: "customer",
                  category: "Customers & Parties",
                  title: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
                  subtitle: `Code: ${c.CODEP || "N/A"} | Station/City: ${c.CITY || "N/A"} | GST: ${c.GSTNO || "Unregistered"}`,
                  details: {
                    customerCode: c.CODEP,
                    partyName: c.PARNAM,
                    mailName: c.MAILNAM,
                    city: c.CITY,
                    phone: c.PHONE1 || "N/A",
                    gstNo: c.GSTNO || "N/A",
                    outstandingBalance: `₹${Math.abs(balance).toLocaleString("en-IN")} ${isDebit ? "Dr" : "Cr"}`,
                    rawBalance: balance,
                    creditLimit: c.CREDIT ? `₹${Number(c.CREDIT).toLocaleString("en-IN")}` : "No Limit",
                    dueDays: c.DUEDAYS || c.CREDITD || 0,
                    orderNo: c.ORDNO || "N/A",
                  },
                  badges: [
                    {
                      label: `Bal: ₹${Math.abs(balance).toLocaleString("en-IN")} ${isDebit ? "Dr" : "Cr"}`,
                      color: balance > 0 ? "amber" : "emerald",
                    },
                    c.CITY ? { label: c.CITY, color: "sky" } : null,
                    c.GSTNO ? { label: "GST Registered", color: "indigo" } : null,
                  ].filter(Boolean),
                  actionUrl: `/dashboard/reports/customer?search=${encodeURIComponent(c.PARNAM || c.CODEP || "")}`,
                  raw: c,
                };
              });

              if (highBalanceOnly) {
                mappedCustomers = mappedCustomers.filter((c) => c.details.rawBalance > 0);
              }

              if (sortBy === "priceHigh") {
                mappedCustomers.sort((a, b) => b.details.rawBalance - a.details.rawBalance);
              } else if (sortBy === "name") {
                mappedCustomers.sort((a, b) => a.title.localeCompare(b.title));
              }

              return mappedCustomers.slice(0, limit);
            } catch (err) {
              console.error("Global search customers error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 3. VOUCHERS & INVOICES SEARCH
      (category === "all" || category === "vouchers")
        ? (async () => {
            try {
              const voucherFilter: any = {
                $or: [
                  { VCN: regex },
                  { CODEP: regex },
                  { REMARK1: regex },
                ],
              };
              if (queryNumber !== null) {
                voucherFilter.$or.push({ VOUCHER: queryNumber });
              }

              let mdisDocs = await SalesMdis.find(voucherFilter).limit(8).lean();
              if ((!mdisDocs || mdisDocs.length === 0) && db) {
                mdisDocs = await db.collection("mdis").find(voucherFilter).limit(8).toArray();
              }

              let gLedgerDocs = await GlLedger.find(voucherFilter).limit(8).lean();
              if ((!gLedgerDocs || gLedgerDocs.length === 0) && db) {
                gLedgerDocs = await db.collection("gledger").find(voucherFilter).limit(8).toArray();
              }

              const resultsList: any[] = [];
              const seenIds = new Set();

              mdisDocs.forEach((m: any) => {
                const vKey = `mdis_${m._id || m.VCN || m.VOUCHER}`;
                if (seenIds.has(vKey)) return;
                seenIds.add(vKey);

                const amount = Number(m.FINAL || m.AMOUNTT || m.AMOUNTP || 0);

                resultsList.push({
                  id: vKey,
                  type: "voucher",
                  category: "Invoices & Sales",
                  title: `Invoice #${m.VCN || m.VOUCHER}`,
                  subtitle: `Party Code: ${m.CODEP || "N/A"} | Date: ${m.DATE || m.CDATE || "N/A"} | Godown: ${m.GODWON || "Main"}`,
                  details: {
                    invoiceNo: m.VCN || m.VOUCHER,
                    voucherNo: m.VOUCHER,
                    customerCode: m.CODEP,
                    invoiceDate: m.DATE || m.CDATE,
                    netAmount: `₹${amount.toLocaleString("en-IN")}`,
                    rawAmount: amount,
                    totalQty: m.ISSUEQTY || "N/A",
                    challanNo: m.CHALLAN || "N/A",
                    dsm: m.DSM || "N/A",
                  },
                  badges: [
                    { label: `₹${amount.toLocaleString("en-IN")}`, color: "indigo" },
                    { label: m.DATE || "Invoice", color: "slate" },
                  ],
                  actionUrl: `/dashboard/reports/sales-receipt?search=${encodeURIComponent(m.VCN || m.VOUCHER || "")}`,
                  raw: m,
                });
              });

              gLedgerDocs.forEach((g: any) => {
                const gKey = `gledger_${g._id || g.VOUCHER}`;
                if (seenIds.has(gKey)) return;
                seenIds.add(gKey);

                const debit = Number(g.DEBIT || 0);
                const credit = Number(g.CREDIT || 0);
                const amount = debit || credit || 0;

                resultsList.push({
                  id: gKey,
                  type: "voucher",
                  category: "Invoices & Vouchers",
                  title: `Voucher #${g.VCN || g.VOUCHER || "N/A"} (${g.TYPE || g.BOOK || "Voucher"})`,
                  subtitle: `Code: ${g.CODE || g.CODE1 || "N/A"} | Date: ${g.DATE || "N/A"} | Particulars: ${g.REMARK1 || "N/A"}`,
                  details: {
                    voucherNo: g.VOUCHER || g.VCN,
                    voucherType: g.TYPE || g.BOOK || "General Ledger",
                    partyCode: g.CODE || g.CODE1,
                    date: g.DATE,
                    debitAmount: debit ? `₹${debit.toLocaleString("en-IN")}` : "₹0",
                    creditAmount: credit ? `₹${credit.toLocaleString("en-IN")}` : "₹0",
                    rawAmount: amount,
                    remark: g.REMARK1 || "N/A",
                  },
                  badges: [
                    { label: debit ? `Dr ₹${debit.toLocaleString("en-IN")}` : `Cr ₹${credit.toLocaleString("en-IN")}`, color: debit ? "amber" : "emerald" },
                    { label: g.TYPE || "Voucher", color: "violet" },
                  ],
                  actionUrl: `/dashboard/reports/sales-receipt?search=${encodeURIComponent(g.VOUCHER || g.VCN || "")}`,
                  raw: g,
                });
              });

              if (sortBy === "priceHigh") {
                resultsList.sort((a, b) => b.details.rawAmount - a.details.rawAmount);
              }

              return resultsList.slice(0, limit);
            } catch (err) {
              console.error("Global search vouchers error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 4. SALES TEAM & MR SEARCH
      (category === "all" || category === "users")
        ? (async () => {
            try {
              const userFilter: any = {
                $or: [
                  { name: regex },
                  { email: regex },
                  { phone: regex },
                  { headquarter: regex },
                  { roleType: regex },
                  { zoneCode: regex },
                  { regionCode: regex },
                ],
              };

              const userDocs = await User.find(userFilter)
                .select("-password")
                .limit(8)
                .lean();

              return userDocs.map((u: any) => ({
                id: `user_${u._id}`,
                type: "user",
                category: "Sales Team & MR",
                title: u.name,
                subtitle: `Role: ${u.roleType || "MR"} | HQ: ${u.headquarter || "N/A"} | Email: ${u.email}`,
                details: {
                  name: u.name,
                  email: u.email,
                  phone: u.phone || "N/A",
                  roleType: u.roleType || "MR",
                  headquarter: u.headquarter || "N/A",
                  zoneCode: u.zoneCode || "N/A",
                  regionCode: u.regionCode || "N/A",
                  profilePhoto: u.profilePhoto || null,
                },
                badges: [
                  { label: u.roleType || "MR", color: "blue" },
                  u.headquarter ? { label: `HQ: ${u.headquarter}`, color: "teal" } : null,
                ].filter(Boolean),
                actionUrl: `/dashboard/mr-territory?search=${encodeURIComponent(u.name || "")}`,
                raw: u,
              }));
            } catch (err) {
              console.error("Global search users error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 5. NAVIGATION & PAGES SEARCH
      (category === "all" || category === "navigation")
        ? (async () => {
            const matches = APP_PAGES.filter((page) => {
              const inTitle = page.title.toLowerCase().includes(query.toLowerCase());
              const inKeywords = page.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()));
              return inTitle || inKeywords;
            });

            return matches.map((p, idx) => ({
              id: `nav_${idx}_${p.path}`,
              type: "navigation",
              category: "Navigation & Pages",
              title: p.title,
              subtitle: `Quick Jump to route: ${p.path}`,
              details: {
                title: p.title,
                route: p.path,
                keywords: p.keywords.join(", "),
              },
              badges: [{ label: "Page Link", color: "cyan" }],
              actionUrl: p.path,
              raw: p,
            }));
          })()
        : Promise.resolve([]),
    ]);

    const totalCount =
      productsRes.length +
      customersRes.length +
      vouchersRes.length +
      usersRes.length +
      navRes.length;

    return NextResponse.json({
      success: true,
      query: rawQuery,
      didYouMean: suggestedQuery ? suggestedQuery : null,
      category,
      totalResults: totalCount,
      results: {
        products: productsRes,
        customers: customersRes,
        vouchers: vouchersRes,
        users: usersRes,
        navigation: navRes,
      },
    });
  } catch (error: any) {
    console.error("Global search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to perform global search",
      },
      { status: 500 }
    );
  }
}
