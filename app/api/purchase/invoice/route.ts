import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseOrder from "@/models/PurchaseOrder";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const billId = searchParams.get("id");
    const vendorId = searchParams.get("vendorId");
    const companyId = searchParams.get("companyId");
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();

    if (billId) {
      const bill = await PurchaseBill.findById(billId).lean();
      if (!bill) {
        return NextResponse.json({ success: false, message: "Purchase bill not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, bill });
    }

    let query: any = {};

    if (companyId && companyId !== "ALL") {
      query.$or = [
        { companyId },
        { companyId: "" },
        { companyId: { $exists: false } },
      ];
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { billNumber: searchRegex },
            { supplierInvoiceNo: searchRegex },
            { vendorName: searchRegex },
            { poNumber: searchRegex },
          ],
        },
      ];
    }

    const bills = await PurchaseBill.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      count: bills.length,
      bills,
    });
  } catch (error: any) {
    console.error("GET Purchase Bills Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      supplierInvoiceNo,
      poId,
      poNumber,
      companyId,
      companyCode,
      fyId,
      fyCode,
      billDate,
      dueDate,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorAddress,
      items,
      remarks,
      paidAmount,
    } = body;

    if (!vendorName) {
      return NextResponse.json({ success: false, message: "Vendor Name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "At least 1 item is required in the purchase bill" }, { status: 400 });
    }

    // Auto-generate Bill Number
    const count = await PurchaseBill.countDocuments();
    const year = new Date().getFullYear();
    const billNumber = body.billNumber || `PB-${year}-${String(count + 1).padStart(4, "0")}`;

    // Item calculation
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems = items.map((it: any) => {
      const qty = Number(it.qty || 1);
      const freeQty = Number(it.freeQty || 0);
      const rate = Number(it.rate || 0);
      const disc = Number(it.discountPercent || 0);
      const gst = Number(it.gstPercent || 12);

      const gross = qty * rate;
      const discAmt = gross * (disc / 100);
      const taxable = gross - discAmt;
      const gstAmt = taxable * (gst / 100);
      const lineTotal = taxable + gstAmt;

      subtotal += gross;
      totalDiscount += discAmt;
      totalTax += gstAmt;

      return {
        productId: it.productId || "",
        productCode: it.productCode || "",
        productName: it.productName || "Product",
        hsnCode: it.hsnCode || "",
        batchNo: it.batchNo || "BATCH-01",
        expDate: it.expDate || "",
        mfgDate: it.mfgDate || "",
        mrp: Number(it.mrp || 0),
        qty,
        freeQty,
        unit: it.unit || "Box",
        rate,
        discountPercent: disc,
        gstPercent: gst,
        taxableAmount: Math.round(taxable * 100) / 100,
        gstAmount: Math.round(gstAmt * 100) / 100,
        total: Math.round(lineTotal * 100) / 100,
      };
    });

    const rawNet = subtotal - totalDiscount + totalTax;
    const netAmount = Math.round(rawNet);
    const roundOff = Math.round((netAmount - rawNet) * 100) / 100;

    const paid = Number(paidAmount || 0);
    const balanceAmount = Math.max(0, netAmount - paid);

    let paymentStatus = "Pending";
    if (paid >= netAmount) {
      paymentStatus = "Paid";
    } else if (paid > 0) {
      paymentStatus = "Partial";
    }

    const newBill = await PurchaseBill.create({
      billNumber,
      supplierInvoiceNo: supplierInvoiceNo || "",
      poId: poId || null,
      poNumber: poNumber || "",
      companyId: companyId || "",
      companyCode: companyCode || "",
      fyId: fyId || "",
      fyCode: fyCode || "",
      billDate: billDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || "",
      vendorId: vendorId || "",
      vendorCode: vendorCode || "",
      vendorName,
      vendorGst: vendorGst || "",
      vendorPhone: vendorPhone || "",
      vendorAddress: vendorAddress || "",
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      cgst: Math.round((totalTax / 2) * 100) / 100,
      sgst: Math.round((totalTax / 2) * 100) / 100,
      igst: 0,
      totalTax: Math.round(totalTax * 100) / 100,
      roundOff,
      netAmount,
      paidAmount: paid,
      balanceAmount,
      paymentStatus,
      remarks: remarks || "",
    });

    // Mark linked Purchase Order as Billed if linked
    if (poId) {
      await PurchaseOrder.findByIdAndUpdate(poId, { status: "Billed" });
    }

    return NextResponse.json({
      success: true,
      message: "Purchase Bill created successfully",
      bill: newBill,
    });
  } catch (error: any) {
    console.error("POST Purchase Bill Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to create Purchase Bill" }, { status: 500 });
  }
}
