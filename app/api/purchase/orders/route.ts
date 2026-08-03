import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const poId = searchParams.get("id") || searchParams.get("poId");
    const vendorId = searchParams.get("vendorId");
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();

    if (poId) {
      const po = await PurchaseOrder.findById(poId).lean();
      if (!po) {
        return NextResponse.json({ success: false, message: "Purchase order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, order: po });
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

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { poNumber: searchRegex },
            { vendorName: searchRegex },
            { vendorCode: searchRegex },
          ],
        },
      ];
    }

    const orders = await PurchaseOrder.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    console.error("GET Purchase Orders Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      companyId,
      companyCode,
      fyId,
      fyCode,
      poDate,
      expectedDeliveryDate,
      priority,
      paymentTerms,
      taxType,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorAddress,
      vendorCity,
      shippingAddress,
      freightCharges,
      items,
      remarks,
    } = body;

    if (!vendorName) {
      return NextResponse.json({ success: false, message: "Vendor Name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "At least 1 product item is required" }, { status: 400 });
    }

    // Auto-generate PO Number if not provided
    const count = await PurchaseOrder.countDocuments();
    const year = new Date().getFullYear();
    const poNumber = body.poNumber || `PO-${year}-${String(count + 1).padStart(4, "0")}`;

    // Process & calculate item totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems = items.map((it: any) => {
      const qty = Number(it.qty || 1);
      const freeQty = Number(it.freeQty || 0);
      const rate = Number(it.rate || 0);
      const disc = Number(it.discountPercent || 0);
      const schemeDisc = Number(it.schemePercent || 0);
      const gst = Number(it.gstPercent || 12);
      const mrp = Number(it.mrp || 0);

      const gross = qty * rate;
      const discAmt = gross * (disc / 100);
      const schemeAmt = gross * (schemeDisc / 100);
      const totalItemDisc = discAmt + schemeAmt;

      const taxable = Math.max(0, gross - totalItemDisc);
      const gstAmt = taxable * (gst / 100);
      const lineTotal = taxable + gstAmt;

      subtotal += gross;
      totalDiscount += totalItemDisc;
      totalTax += gstAmt;

      return {
        productId: it.productId || "",
        productCode: it.productCode || "",
        productName: it.productName || "Product",
        hsnCode: it.hsnCode || "",
        batchNo: it.batchNo || "",
        expDate: it.expDate || "",
        mrp,
        qty,
        freeQty,
        unit: it.unit || "Box",
        rate,
        discountPercent: disc,
        schemePercent: schemeDisc,
        gstPercent: gst,
        taxableAmount: Math.round(taxable * 100) / 100,
        gstAmount: Math.round(gstAmt * 100) / 100,
        total: Math.round(lineTotal * 100) / 100,
      };
    });

    const freight = Number(freightCharges || 0);
    const isInterstate = taxType === "Interstate";

    const cgst = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
    const sgst = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
    const igst = isInterstate ? Math.round(totalTax * 100) / 100 : 0;

    const rawNet = subtotal - totalDiscount + totalTax + freight;
    const netTotal = Math.round(rawNet);
    const roundOff = Math.round((netTotal - rawNet) * 100) / 100;

    const newPO = await PurchaseOrder.create({
      poNumber,
      companyId: companyId || "",
      companyCode: companyCode || "",
      fyId: fyId || "",
      fyCode: fyCode || "",
      poDate: poDate || new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: expectedDeliveryDate || "",
      priority: priority || "Normal",
      paymentTerms: paymentTerms || "30 Days Credit",
      taxType: taxType || "Intrastate",
      vendorId: vendorId || "",
      vendorCode: vendorCode || "",
      vendorName,
      vendorGst: vendorGst || "",
      vendorPhone: vendorPhone || "",
      vendorAddress: vendorAddress || "",
      vendorCity: vendorCity || "",
      shippingAddress: shippingAddress || "",
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      freightCharges: freight,
      totalTax: Math.round(totalTax * 100) / 100,
      cgst,
      sgst,
      igst,
      roundOff,
      netTotal,
      status: "Pending",
      remarks: remarks || "",
    });

    return NextResponse.json({
      success: true,
      message: "Purchase Order created successfully",
      order: newPO,
    });
  } catch (error: any) {
    console.error("POST Purchase Order Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to create PO" }, { status: 500 });
  }
}
