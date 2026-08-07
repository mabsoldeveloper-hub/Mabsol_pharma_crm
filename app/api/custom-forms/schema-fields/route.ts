import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function inferFieldType(val: any): "text" | "number" | "date" | "checkbox" | "select" {
  if (typeof val === "number") return "number";
  if (typeof val === "boolean") return "checkbox";
  if (val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))) return "date";
  return "text";
}

export async function GET() {
  try {
    await connectToDatabase();

    // 1. High quality curated default presets for core CRM modules
    const curatedSchemaMap = [
      {
        tableName: "SalesOrder",
        displayName: "⭐ Sales Orders (Orders)",
        category: "Sales",
        isCurated: true,
        fields: [
          { key: "orderNo", label: "Sales Order No", type: "text" },
          { key: "orderDate", label: "Order Date", type: "date" },
          { key: "customerCode", label: "Customer / Party Code", type: "text" },
          { key: "customerName", label: "Customer / Party Name", type: "text" },
          { key: "divisionCode", label: "Division Code", type: "text" },
          { key: "pobAmount", label: "POB Amount (₹)", type: "number" },
          { key: "grossAmount", label: "Gross Amount (₹)", type: "number" },
          { key: "discountAmount", label: "Discount Amount (₹)", type: "number" },
          { key: "totalAmount", label: "Net Total Amount (₹)", type: "number" },
          { key: "itemsCount", label: "Items Count", type: "number" },
          { key: "orderStatus", label: "Order Status", type: "select", options: ["Pending", "Approved", "Billed", "Cancelled"] },
          { key: "paymentMode", label: "Payment Mode", type: "select", options: ["Credit", "Cash", "Advance", "PDC"] },
          { key: "salesmanName", label: "Salesman / MR Name", type: "text" },
          { key: "deliveryDate", label: "Expected Delivery Date", type: "date" },
          { key: "remarks", label: "Order Notes / Remarks", type: "textarea" },
        ],
      },
      {
        tableName: "SalesInvoice",
        displayName: "⭐ Sales Invoices / Bills",
        category: "Sales",
        isCurated: true,
        fields: [
          { key: "invoiceNo", label: "Sales Invoice No", type: "text" },
          { key: "invoiceDate", label: "Invoice Date", type: "date" },
          { key: "customerCode", label: "Customer Code", type: "text" },
          { key: "customerName", label: "Customer Name", type: "text" },
          { key: "grossAmount", label: "Gross Bill Amount (₹)", type: "number" },
          { key: "taxableAmount", label: "Taxable Value (₹)", type: "number" },
          { key: "cgstAmount", label: "CGST (₹)", type: "number" },
          { key: "sgstAmount", label: "SGST (₹)", type: "number" },
          { key: "igstAmount", label: "IGST (₹)", type: "number" },
          { key: "netAmount", label: "Net Payable Invoice Amount (₹)", type: "number" },
          { key: "dueDate", label: "Payment Due Date", type: "date" },
          { key: "paymentStatus", label: "Payment Status", type: "select", options: ["Unpaid", "Paid", "Partially Paid", "Overdue"] },
        ],
      },
      {
        tableName: "PurchaseBill",
        displayName: "⭐ Purchase Bills & Invoices",
        category: "Purchase",
        isCurated: true,
        fields: [
          { key: "billNo", label: "Purchase Bill No", type: "text" },
          { key: "billDate", label: "Bill / Invoice Date", type: "date" },
          { key: "vendorCode", label: "Supplier / Vendor Code", type: "text" },
          { key: "vendorName", label: "Supplier / Vendor Name", type: "text" },
          { key: "vendorGstin", label: "Supplier GSTIN", type: "text" },
          { key: "grossAmount", label: "Gross Amount (₹)", type: "number" },
          { key: "discountAmount", label: "Trade Discount (₹)", type: "number" },
          { key: "taxableValue", label: "Taxable Value (₹)", type: "number" },
          { key: "gstAmount", label: "Total GST Amount (₹)", type: "number" },
          { key: "netAmount", label: "Net Bill Amount (₹)", type: "number" },
          { key: "dueDate", label: "Due Date", type: "date" },
          { key: "paymentStatus", label: "Payment Status", type: "select", options: ["Unpaid", "Paid", "Partially Paid"] },
          { key: "voucherSeries", label: "Voucher Series", type: "text" },
        ],
      },
      {
        tableName: "PurchaseOrder",
        displayName: "⭐ Purchase Orders (PO)",
        category: "Purchase",
        isCurated: true,
        fields: [
          { key: "poNumber", label: "PO Number", type: "text" },
          { key: "poDate", label: "PO Date", type: "date" },
          { key: "vendorCode", label: "Vendor / Supplier Code", type: "text" },
          { key: "vendorName", label: "Vendor Name", type: "text" },
          { key: "totalQty", label: "Total Quantity Ordered", type: "number" },
          { key: "grossTotal", label: "Gross Total (₹)", type: "number" },
          { key: "taxAmount", label: "Tax Amount (₹)", type: "number" },
          { key: "netAmount", label: "Net Total PO Amount (₹)", type: "number" },
          { key: "poStatus", label: "PO Status", type: "select", options: ["Draft", "Sent to Vendor", "Approved", "Received", "Cancelled"] },
          { key: "expectedDeliveryDate", label: "Expected Delivery Date", type: "date" },
          { key: "terms", label: "Terms & Conditions", type: "textarea" },
        ],
      },
      {
        tableName: "PurchasePayment",
        displayName: "⭐ Purchase Payments & Vouchers",
        category: "Purchase",
        isCurated: true,
        fields: [
          { key: "paymentNo", label: "Payment Voucher No", type: "text" },
          { key: "paymentDate", label: "Payment Date", type: "date" },
          { key: "vendorCode", label: "Vendor Code", type: "text" },
          { key: "vendorName", label: "Vendor Name", type: "text" },
          { key: "amountPaid", label: "Amount Paid (₹)", type: "number" },
          { key: "paymentMethod", label: "Payment Method", type: "select", options: ["Bank Transfer (NEFT/RTGS)", "Cheque", "Cash", "UPI"] },
          { key: "refNo", label: "Cheque / Transaction Ref No", type: "text" },
          { key: "bankName", label: "Bank / Cash Account", type: "text" },
          { key: "remarks", label: "Payment Remarks", type: "textarea" },
        ],
      },
      {
        tableName: "PurchaseReturn",
        displayName: "⭐ Purchase Returns / Debit Notes",
        category: "Purchase",
        isCurated: true,
        fields: [
          { key: "returnNo", label: "Debit Note / Return No", type: "text" },
          { key: "returnDate", label: "Return Date", type: "date" },
          { key: "originalBillNo", label: "Original Purchase Bill No", type: "text" },
          { key: "vendorCode", label: "Vendor Code", type: "text" },
          { key: "vendorName", label: "Vendor Name", type: "text" },
          { key: "returnAmount", label: "Return Amount (₹)", type: "number" },
          { key: "gstReversal", label: "GST Reversal Amount (₹)", type: "number" },
          { key: "reason", label: "Reason for Return", type: "textarea" },
        ],
      },
      {
        tableName: "Customer",
        displayName: "⭐ Customers Master (Stockists & Chemists)",
        category: "Masters & Stock",
        isCurated: true,
        fields: [
          { key: "partyCode", label: "Party Code", type: "text" },
          { key: "partyName", label: "Party / Customer Name", type: "text" },
          { key: "station", label: "Station / Headquarter", type: "text" },
          { key: "route", label: "Route Name", type: "text" },
          { key: "address", label: "Address", type: "text" },
          { key: "city", label: "City", type: "text" },
          { key: "state", label: "State", type: "text" },
          { key: "pincode", label: "Pincode", type: "text" },
          { key: "mobile", label: "Mobile Number", type: "text" },
          { key: "email", label: "Email Address", type: "text" },
          { key: "gstin", label: "GSTIN Number", type: "text" },
          { key: "dlNo1", label: "Drug License No 1", type: "text" },
          { key: "dlNo2", label: "Drug License No 2", type: "text" },
          { key: "creditLimit", label: "Credit Limit (₹)", type: "number" },
          { key: "creditDays", label: "Credit Days Allowed", type: "number" },
          { key: "openingBalance", label: "Opening Balance (₹)", type: "number" },
          { key: "currentBalance", label: "Current Ledger Balance (₹)", type: "number" },
        ],
      },
      {
        tableName: "Product",
        displayName: "⭐ Products & Medicine Master",
        category: "Masters & Stock",
        isCurated: true,
        fields: [
          { key: "productCode", label: "Product Code", type: "text" },
          { key: "productName", label: "Product Name", type: "text" },
          { key: "genericName", label: "Composition / Generic Name", type: "text" },
          { key: "pack", label: "Pack Size", type: "text" },
          { key: "caseQty", label: "Case Packing Qty", type: "number" },
          { key: "boxQty", label: "Box Packing Qty", type: "number" },
          { key: "hsnCode", label: "HSN Code", type: "text" },
          { key: "gstRate", label: "GST Rate (%)", type: "number" },
          { key: "mrp", label: "MRP (₹)", type: "number" },
          { key: "purchaseRate", label: "Purchase Rate (₹)", type: "number" },
          { key: "tradeRate", label: "Trade / Billing Rate (₹)", type: "number" },
          { key: "retailRate", label: "Retail Rate (₹)", type: "number" },
          { key: "companyCode", label: "Company Code", type: "text" },
          { key: "divisionCode", label: "Division Code", type: "text" },
        ],
      },
      {
        tableName: "Batch",
        displayName: "⭐ Stock & Product Batches",
        category: "Masters & Stock",
        isCurated: true,
        fields: [
          { key: "batchNo", label: "Batch Number", type: "text" },
          { key: "productCode", label: "Product Code", type: "text" },
          { key: "productName", label: "Product Name", type: "text" },
          { key: "mfgDate", label: "Manufacturing Date", type: "date" },
          { key: "expDate", label: "Expiry Date", type: "date" },
          { key: "mrp", label: "Batch MRP (₹)", type: "number" },
          { key: "saleRate", label: "Batch Sale Rate (₹)", type: "number" },
          { key: "availableStock", label: "Available Stock Qty", type: "number" },
        ],
      },
      {
        tableName: "MrDcr",
        displayName: "⭐ MR Daily Call Report (DCR)",
        category: "MR Work",
        isCurated: true,
        fields: [
          { key: "dcrDate", label: "DCR Date", type: "date" },
          { key: "workType", label: "Work Type", type: "select", options: ["Field Work", "Office Work", "Meeting", "Leave", "Holiday"] },
          { key: "stationType", label: "Station Type", type: "select", options: ["HQ", "EX", "OS"] },
          { key: "areaVisited", label: "Area Visited", type: "text" },
          { key: "totalDoctorCalls", label: "Doctor Calls Count", type: "number" },
          { key: "totalChemistCalls", label: "Chemist Calls Count", type: "number" },
          { key: "totalStockistCalls", label: "Stockist Calls Count", type: "number" },
          { key: "totalPobAmount", label: "Total POB Amount (₹)", type: "number" },
          { key: "approvalStatus", label: "Approval Status", type: "select", options: ["Pending", "Approved", "Rejected"] },
          { key: "approvalRemarks", label: "Manager Approval Remarks", type: "textarea" },
        ],
      },
      {
        tableName: "MrCallLog",
        displayName: "⭐ MR Call Detail Logs",
        category: "MR Work",
        isCurated: true,
        fields: [
          { key: "customerCode", label: "Customer Code", type: "text" },
          { key: "customerName", label: "Customer / Doctor Name", type: "text" },
          { key: "customerType", label: "Customer Type", type: "select", options: ["Doctor", "Chemist", "Stockist"] },
          { key: "pobAmount", label: "POB Amount (₹)", type: "number" },
          { key: "discussionPoints", label: "Discussion Notes", type: "textarea" },
          { key: "sampleGiven", label: "Sample Given", type: "text" },
          { key: "giftPromoted", label: "Gift Promoted", type: "text" },
        ],
      },
      {
        tableName: "TargetMaster",
        displayName: "⭐ MR Sales Target Master",
        category: "MR Work",
        isCurated: true,
        fields: [
          { key: "targetMonth", label: "Target Month", type: "number" },
          { key: "targetYear", label: "Target Year", type: "number" },
          { key: "targetPobAmount", label: "Target POB Amount (₹)", type: "number" },
          { key: "targetCalls", label: "Target Calls Count", type: "number" },
          { key: "targetDoctorCoverage", label: "Doctor Coverage Target %", type: "number" },
        ],
      },
      {
        tableName: "GLedger",
        displayName: "⭐ General Ledgers & Accounts",
        category: "Finance & Users",
        isCurated: true,
        fields: [
          { key: "accountCode", label: "Account Code", type: "text" },
          { key: "accountName", label: "Account / Ledger Name", type: "text" },
          { key: "groupCode", label: "Account Group Code", type: "text" },
          { key: "groupName", label: "Account Group Name", type: "text" },
          { key: "openingBalance", label: "Opening Balance (₹)", type: "number" },
          { key: "closingBalance", label: "Closing Balance (₹)", type: "number" },
        ],
      },
      {
        tableName: "User",
        displayName: "⭐ Users & Team Hierarchy",
        category: "Finance & Users",
        isCurated: true,
        fields: [
          { key: "name", label: "User Name", type: "text" },
          { key: "email", label: "Email Address", type: "text" },
          { key: "employeeCode", label: "Employee Code", type: "text" },
          { key: "roleType", label: "Role Type", type: "select", options: ["MR", "RSM", "ZSM", "Admin"] },
          { key: "designation", label: "Designation", type: "text" },
          { key: "headquarter", label: "Headquarter", type: "text" },
          { key: "mobile", label: "Mobile No", type: "text" },
          { key: "department", label: "Department", type: "text" },
        ],
      },
      {
        tableName: "AreaMaster",
        displayName: "⭐ Area & Territory Master",
        category: "Finance & Users",
        isCurated: true,
        fields: [
          { key: "state", label: "State", type: "text" },
          { key: "city", label: "City", type: "text" },
          { key: "areaName", label: "Area Name", type: "text" },
          { key: "pincode", label: "Pincode", type: "text" },
          { key: "zone", label: "Zone", type: "text" },
        ],
      },
    ];

    // 2. DYNAMIC MONGODB COLLECTION INSPECTION
    const dynamicSchemas: any[] = [];
    if (mongoose.connection && mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();

      for (const col of collections) {
        const colName = col.name;
        if (colName.startsWith("system.") || colName.startsWith("fs.")) continue;

        try {
          const sampleDoc = await mongoose.connection.db
            .collection(colName)
            .findOne({});

          if (sampleDoc) {
            const detectedFields: any[] = [];
            Object.keys(sampleDoc).forEach((key) => {
              if (key === "_id" || key === "__v" || key === "password") return;
              const val = sampleDoc[key];
              if (typeof val === "object" && val !== null && !(val instanceof Date) && !Array.isArray(val)) {
                Object.keys(val).forEach((subKey) => {
                  detectedFields.push({
                    key: `${key}.${subKey}`,
                    label: `${formatFieldLabel(key)} - ${formatFieldLabel(subKey)}`,
                    type: inferFieldType(val[subKey]),
                  });
                });
              } else {
                detectedFields.push({
                  key,
                  label: formatFieldLabel(key),
                  type: inferFieldType(val),
                });
              }
            });

            if (detectedFields.length > 0) {
              dynamicSchemas.push({
                tableName: colName,
                displayName: `Raw DB: ${colName}`,
                category: "Raw DB Collections",
                isCurated: false,
                fields: detectedFields,
              });
            }
          }
        } catch (e) {
          console.error(`Error inspecting collection ${colName}:`, e);
        }
      }
    }

    const fullSchemaMap = [...curatedSchemaMap, ...dynamicSchemas];

    return NextResponse.json({ success: true, schemas: fullSchemaMap });
  } catch (error: any) {
    console.error("Error fetching schema fields:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
