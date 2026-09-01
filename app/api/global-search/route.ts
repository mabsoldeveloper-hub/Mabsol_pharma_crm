import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import Order from "@/models/Order";
import GlLedger from "@/models/GlLedger";
import SalesMdis from "@/models/SalesMdis";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchasePayment from "@/models/PurchasePayment";
import PurchaseReturn from "@/models/PurchaseReturn";
import User from "@/models/User";
import { getDefaultMenuItems } from "@/lib/defaultMenuData";

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Clean spoken voice queries dynamically (strip assistant names and emojis)
function cleanSpokenQuery(input: string, assistantName: string = "AI Assistant"): string {
  if (!input) return "";
  let text = input.trim();

  const nameEscaped = (assistantName || "AI Assistant").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  text = text.replace(new RegExp(`\\b(${nameEscaped}|alexa|siri|jarvis|ai)\\b`, "gi"), "");
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
  return text.replace(/\s+/g, " ").trim() || input.trim();
}

// Dynamic Navigation Loader from Database Menu Adjustments / Default Menu Structure
async function getDynamicNavPages(db: any): Promise<{ title: string; path: string; category: string }[]> {
  try {
    let menuItems: any[] = [];
    if (db) {
      const savedMenu = await db.collection("menu_adjustments").findOne({ isCustomized: true });
      if (savedMenu && Array.isArray(savedMenu.items) && savedMenu.items.length > 0) {
        menuItems = savedMenu.items;
      }
    }
    if (!menuItems || menuItems.length === 0) {
      menuItems = getDefaultMenuItems();
    }

    const pages: { title: string; path: string; category: string }[] = [];
    menuItems.forEach((m: any) => {
      if (m.href) {
        pages.push({ title: m.label, path: m.href, category: "Navigation" });
      }
      if (Array.isArray(m.subItems)) {
        m.subItems.forEach((sub: any) => {
          if (sub.href) {
            pages.push({ title: `${m.label} > ${sub.label}`, path: sub.href, category: m.label || "Navigation" });
          }
        });
      }
    });

    return pages;
  } catch (e) {
    return getDefaultMenuItems().flatMap((m: any) => {
      const list = m.href ? [{ title: m.label, path: m.href, category: "Navigation" }] : [];
      if (Array.isArray(m.subItems)) {
        m.subItems.forEach((sub: any) => {
          if (sub.href) list.push({ title: `${m.label} > ${sub.label}`, path: sub.href, category: m.label });
        });
      }
      return list;
    });
  }
}

// Dynamic Vocal Summary Generator based on real matched records
function generateVocalSummary(query: string, results: any): string | null {
  if (!query) return null;

  const allItems = [
    ...(results.products || []),
    ...(results.customers || []),
    ...(results.vouchers || []),
    ...(results.users || []),
    ...(results.navigation || []),
  ];

  if (allItems.length > 0) {
    const topItem = allItems[0];
    return `Found ${allItems.length} results. Top match: ${topItem.title}.`;
  }

  return `No records found matching "${query}".`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawQuery = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || 30), 60);

    const conn = await dbConnect();
    const db = conn.connection.db;

    // Handle empty query: Return DYNAMIC Database Trending Items from actual DB collections
    if (!rawQuery || rawQuery.length < 1) {
      try {
        let topPro = await Product.find({ PRODUCT: { $exists: true, $ne: "" } }).limit(4).lean();
        if ((!topPro || topPro.length === 0) && db) {
          topPro = await db.collection("vfp_new_folder_pro").find({ PRODUCT: { $exists: true, $ne: "" } }).limit(4).toArray();
        }

        let topCust = await Order.find({ PARNAM: { $exists: true, $ne: "" } }).limit(4).lean();
        if ((!topCust || topCust.length === 0) && db) {
          topCust = await db.collection("vfp_new_folder_order").find({ PARNAM: { $exists: true, $ne: "" } }).limit(4).toArray();
        }

        const dynamicTrending: any[] = [];

        (topPro || []).forEach((p: any) => {
          dynamicTrending.push({
            label: p.PRODUCT || p.BILLNAME || `Product ${p.CODE}`,
            category: "Product",
            query: p.PRODUCT || String(p.CODE),
            actionUrl: `/dashboard/reports/product?search=${encodeURIComponent(p.PRODUCT || p.CODE || "")}`,
            type: "product",
          });
        });

        (topCust || []).forEach((c: any) => {
          dynamicTrending.push({
            label: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
            category: c.CITY ? `Party (${c.CITY})` : "Customer Party",
            query: c.PARNAM || String(c.CODEP),
            actionUrl: `/dashboard/reports/customer?search=${encodeURIComponent(c.PARNAM || c.CODEP || "")}`,
            type: "customer",
          });
        });

        const navPages = await getDynamicNavPages(db);
        navPages.slice(0, 4).forEach((p) => {
          dynamicTrending.push({
            label: p.title,
            category: "Page Link",
            query: p.title,
            actionUrl: p.path,
            type: "navigation",
          });
        });

        return NextResponse.json({
          success: true,
          query: "",
          totalResults: 0,
          vocalSummary: "Live Search active. Speak or type to search database records.",
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
        console.error("Dynamic trending error:", err);
      }
    }

    // Filters and Sorting
    const inStockOnly = searchParams.get("inStock") === "true";
    const nearExpiryOnly = searchParams.get("nearExpiry") === "true";
    const highBalanceOnly = searchParams.get("highBalance") === "true";
    const sortBy = searchParams.get("sortBy") || "relevance";
    const assistantName = searchParams.get("assistantName") || searchParams.get("assistant") || "AI Assistant";

    const query = cleanSpokenQuery(rawQuery, assistantName);
    const regex = new RegExp(escapeRegex(query), "i");
    const isNumeric = !isNaN(Number(query));
    const queryNumber = isNumeric ? Number(query) : null;

    // Parallel search across MongoDB database
    const [productsRes, customersRes, vouchersRes, usersRes, navRes] = await Promise.all([
      // 1. PRODUCTS & STOCK
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
              proDocs = await db.collection("vfp_new_folder_pro").find(productFilter).limit(15).toArray();
            }

            const productCodes = proDocs.map((p: any) => p.CODE).filter(Boolean);
            let batchesByCode: Record<string | number, any[]> = {};

            if (productCodes.length > 0) {
              let batchDocs = await ProductBatch.find({ CODE: { $in: productCodes } }).lean();
              if ((!batchDocs || batchDocs.length === 0) && db) {
                batchDocs = await db.collection("vfp_new_folder_probat").find({ CODE: { $in: productCodes } }).toArray();
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

              const ninetyDaysLater = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
              const hasNearExpiryBatch = pBatches.some((b) => b.EXP && b.EXP <= ninetyDaysLater);

              return {
                id: `prod_${p._id || p.CODE}`,
                type: "product",
                category: "Products & Stock",
                title: p.PRODUCT || p.BILLNAME || `Product #${p.CODE}`,
                subtitle: `Code: ${p.CODE || "N/A"} | Pack: ${p.PACKING || "Std"} | Group/Mfg: ${p.GCODE || "General"}`,
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

            if (inStockOnly) {
              mappedProducts = mappedProducts.filter((p) => p.details.currentStock > 0);
            }
            if (nearExpiryOnly) {
              mappedProducts = mappedProducts.filter((p) => p.details.hasNearExpiry);
            }

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
            console.error("Products search error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 2. CUSTOMERS & PARTIES
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
              custDocs = await db.collection("vfp_new_folder_order").find(customerFilter).limit(15).toArray();
            }

            let mappedCustomers = custDocs.map((c: any) => {
              const balance = Number(c.BALANCE || 0);
              const isDebit = balance > 0;

              return {
                id: `cust_${c._id || c.CODEP}`,
                type: "customer",
                category: "Customers & Parties",
                title: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
                subtitle: `Code: ${c.CODEP || "N/A"} | Station: ${c.CITY || "N/A"} | GST: ${c.GSTNO || "Unregistered"}`,
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
            console.error("Customers search error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 3. INVOICES, VOUCHERS, BILLS & TRANSACTIONS
      (category === "all" || category === "vouchers")
        ? (async () => {
          try {
            const resultsList: any[] = [];
            const seenIds = new Set();

            const stringFilter: any = {
              $or: [
                { billNumber: regex },
                { supplierInvoiceNo: regex },
                { poNumber: regex },
                { voucherNo: regex },
                { vcn: regex },
                { VCN: regex },
                { VOUCHER: regex },
                { CODEP: regex },
                { vendorName: regex },
                { customerName: regex },
                { REMARK1: regex },
                { remarks: regex },
                { reason: regex },
              ],
            };
            if (queryNumber !== null) {
              stringFilter.$or.push({ VOUCHER: queryNumber }, { billNumber: queryNumber }, { poNumber: queryNumber });
            }

            // Purchase Bills
            let purBills = await PurchaseBill.find(stringFilter).limit(8).lean();
            if ((!purBills || purBills.length === 0) && db) {
              purBills = await db.collection("purchasebills").find(stringFilter).limit(8).toArray();
              if (!purBills || purBills.length === 0) {
                purBills = await db.collection("purmdis").find(stringFilter).limit(8).toArray();
              }
            }
            (purBills || []).forEach((b: any) => {
              const bKey = `pur_bill_${b._id || b.billNumber || b.supplierInvoiceNo}`;
              if (seenIds.has(bKey)) return;
              seenIds.add(bKey);
              const amt = Number(b.netAmount || b.FINAL || b.totalAmount || 0);

              resultsList.push({
                id: bKey,
                type: "voucher",
                category: "Purchase Invoices",
                title: `Purchase Bill #${b.billNumber || b.supplierInvoiceNo || b.VCN}`,
                subtitle: `Vendor: ${b.vendorName || b.CODEP || "N/A"} | Date: ${b.billDate || b.DATE || "N/A"}`,
                details: {
                  billNumber: b.billNumber || b.supplierInvoiceNo || b.VCN,
                  vendorName: b.vendorName || b.CODEP,
                  billDate: b.billDate || b.DATE,
                  netAmount: `₹${amt.toLocaleString("en-IN")}`,
                  rawAmount: amt,
                  paymentStatus: b.paymentStatus || "Pending",
                },
                badges: [
                  { label: `₹${amt.toLocaleString("en-IN")}`, color: "rose" },
                  { label: "Purchase Bill 🛒", color: "violet" },
                ],
                actionUrl: `/dashboard/purchase/invoice?search=${encodeURIComponent(b.billNumber || b.vendorName || "")}`,
                raw: b,
              });
            });

            // Sales Invoices
            let mdisDocs = await SalesMdis.find(stringFilter).limit(8).lean();
            if ((!mdisDocs || mdisDocs.length === 0) && db) {
              mdisDocs = await db.collection("vfp_new_folder_mdis").find(stringFilter).limit(8).toArray();
            }
            (mdisDocs || []).forEach((m: any) => {
              const vKey = `mdis_${m._id || m.VCN || m.VOUCHER}`;
              if (seenIds.has(vKey)) return;
              seenIds.add(vKey);
              const amount = Number(m.FINAL || m.AMOUNTT || m.AMOUNTP || 0);

              resultsList.push({
                id: vKey,
                type: "voucher",
                category: "Sales Invoices",
                title: `Sales Invoice #${m.VCN || m.VOUCHER}`,
                subtitle: `Party: ${m.CODEP || "N/A"} | Date: ${m.DATE || m.CDATE || "N/A"}`,
                details: {
                  invoiceNo: m.VCN || m.VOUCHER,
                  voucherNo: m.VOUCHER,
                  customerCode: m.CODEP,
                  invoiceDate: m.DATE || m.CDATE,
                  netAmount: `₹${amount.toLocaleString("en-IN")}`,
                  rawAmount: amount,
                },
                badges: [
                  { label: `₹${amount.toLocaleString("en-IN")}`, color: "indigo" },
                  { label: "Sales Invoice 🧾", color: "slate" },
                ],
                actionUrl: `/dashboard/reports/sales-receipt?search=${encodeURIComponent(m.VCN || m.VOUCHER || "")}`,
                raw: m,
              });
            });

            // General Ledgers
            let gLedgerDocs = await GlLedger.find(stringFilter).limit(8).lean();
            if ((!gLedgerDocs || gLedgerDocs.length === 0) && db) {
              gLedgerDocs = await db.collection("vfp_new_folder_gledger").find(stringFilter).limit(8).toArray();
            }
            (gLedgerDocs || []).forEach((g: any) => {
              const gKey = `gledger_${g._id || g.VOUCHER}`;
              if (seenIds.has(gKey)) return;
              seenIds.add(gKey);

              const debit = Number(g.DEBIT || 0);
              const credit = Number(g.CREDIT || 0);
              const amount = debit || credit || 0;

              resultsList.push({
                id: gKey,
                type: "voucher",
                category: "General Ledger Vouchers",
                title: `Voucher #${g.VCN || g.VOUCHER || "N/A"}`,
                subtitle: `Code: ${g.CODE || g.CODE1 || "N/A"} | Date: ${g.DATE || "N/A"} | ${g.REMARK1 || ""}`,
                details: {
                  voucherNo: g.VOUCHER || g.VCN,
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
            console.error("Vouchers search error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 4. SALES TEAM & USERS
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

            const userDocs = await User.find(userFilter).select("-password").limit(8).lean();

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
              },
              badges: [
                { label: u.roleType || "MR", color: "blue" },
                u.headquarter ? { label: `HQ: ${u.headquarter}`, color: "teal" } : null,
              ].filter(Boolean),
              actionUrl: `/dashboard/mr-territory?search=${encodeURIComponent(u.name || "")}`,
              raw: u,
            }));
          } catch (err) {
            console.error("Users search error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),

      // 5. NAVIGATION & SYSTEM PAGES (Loaded dynamically from database / menu configs)
      (category === "all" || category === "navigation")
        ? (async () => {
          try {
            const navPages = await getDynamicNavPages(db);
            const matches = navPages.filter((p) => {
              return regex.test(p.title) || regex.test(p.path);
            });

            return matches.map((p, idx) => ({
              id: `nav_${idx}_${p.path}`,
              type: "navigation",
              category: p.category || "Navigation & Pages",
              title: p.title,
              subtitle: `Route: ${p.path}`,
              details: {
                title: p.title,
                route: p.path,
              },
              badges: [
                { label: "Page Route", color: "indigo" },
              ],
              actionUrl: p.path,
              raw: p,
            }));
          } catch (err) {
            console.error("Nav search error:", err);
            return [];
          }
        })()
        : Promise.resolve([]),
    ]);

    const totalCount =
      productsRes.length +
      customersRes.length +
      vouchersRes.length +
      usersRes.length +
      navRes.length;

    const vocalSummary = generateVocalSummary(query, {
      products: productsRes,
      customers: customersRes,
      vouchers: vouchersRes,
      users: usersRes,
      navigation: navRes,
    });

    return NextResponse.json({
      success: true,
      query: rawQuery,
      category,
      totalResults: totalCount,
      vocalSummary,
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
