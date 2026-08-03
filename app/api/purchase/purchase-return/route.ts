import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseReturn from "@/models/PurchaseReturn";
import PurchaseBill from "@/models/PurchaseBill";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import { consumeNextVoucherNumber, peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Action 1: Preview next voucher number
    if (action === "nextNumber") {
      const nextVcn = await peekNextVoucherNumber("DEBIT_NOTE");
      return NextResponse.json({ success: true, nextVcn });
    }

    // Action 2: Summary Metrics
    if (action === "metrics") {
      const today = todayStr();
      const [totalAgg, todayAgg] = await Promise.all([
        PurchaseReturn.aggregate([
          { $group: { _id: null, totalAmount: { $sum: "$netAmount" }, count: { $sum: 1 } } }
        ]),
        PurchaseReturn.aggregate([
          { $match: { returnDate: today } },
          { $group: { _id: null, totalAmount: { $sum: "$netAmount" }, count: { $sum: 1 } } }
        ])
      ]);

      return NextResponse.json({
        success: true,
        totalReturnsAmount: totalAgg[0]?.totalAmount || 0,
        totalReturnsCount: totalAgg[0]?.count || 0,
        todayReturnsAmount: todayAgg[0]?.totalAmount || 0,
        todayReturnsCount: todayAgg[0]?.count || 0,
      });
    }

    // Action 3: Vendor Bills for line items selection
    if (action === "vendorBills") {
      const vendorId = (searchParams.get("vendorId") || "").trim();
      const vendorName = (searchParams.get("vendorName") || "").trim();

      let query: any = {};
      if (vendorId) {
        query.$or = [{ vendorId }, { vendorCode: vendorId }];
      } else if (vendorName) {
        query.vendorName = new RegExp(vendorName, "i");
      }

      const bills = await PurchaseBill.find(query)
        .sort({ billDate: -1, createdAt: -1 })
        .limit(30)
        .lean();

      return NextResponse.json({
        success: true,
        bills,
      });
    }

    // Action 4: Default - List Purchase Returns with Pagination & Search
    const search = (searchParams.get("search") || "").trim();
    const vendorId = (searchParams.get("vendorId") || "").trim();
    const companyId = (searchParams.get("companyId") || "").trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    let query: any = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { vcn: regex },
        { vendorName: regex },
        { vendorCode: regex },
        { originalBillNo: regex },
        { reason: regex },
      ];
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (companyId && companyId !== "ALL") {
      query.companyId = companyId;
    }

    const [returns, total] = await Promise.all([
      PurchaseReturn.find(query).sort({ returnDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      PurchaseReturn.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("GET Purchase Return Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      returnDate,
      originalBillNo,
      companyId,
      companyCode,
      fyId,
      fyCode,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorAddress,
      vendorCity,
      reason,
      deductFromInventory,
      items,
      subtotal,
      totalDiscount,
      cgst,
      sgst,
      igst,
      totalTax,
      roundOff,
      netAmount,
      remarks,
    } = body;

    if (!vendorName) {
      return NextResponse.json({ success: false, message: "Vendor/Supplier Name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "At least 1 return item is required" }, { status: 400 });
    }

    // Generate unique VCN for Debit Note
    const vcn = await consumeNextVoucherNumber("DEBIT_NOTE");

    // Clean items
    const cleanedItems = items.map((item: any) => ({
      productId: item.productId || "",
      productCode: item.productCode || item.code || "",
      productName: item.productName || item.product || "Returned Item",
      hsnCode: item.hsnCode || item.hsn || "",
      batchNo: item.batchNo || item.batch || "BATCH-01",
      expDate: item.expDate || item.exp || "",
      qty: Number(item.qty) || 1,
      unit: item.unit || "Box",
      rate: Number(item.rate) || 0,
      discountPercent: Number(item.discountPercent || item.disP) || 0,
      gstPercent: Number(item.gstPercent || item.taxP) || 0,
      taxableAmount: Number(item.taxableAmount) || (Number(item.qty || 1) * Number(item.rate || 0)),
      gstAmount: Number(item.gstAmount) || 0,
      total: Number(item.total) || (Number(item.qty || 1) * Number(item.rate || 0)),
    }));

    const newReturn = await PurchaseReturn.create({
      vcn,
      returnDate: returnDate || todayStr(),
      originalBillNo: originalBillNo || "",
      companyId: companyId || "",
      companyCode: companyCode || "",
      fyId: fyId || "",
      fyCode: fyCode || "",
      vendorId: vendorId || "",
      vendorCode: vendorCode || "",
      vendorName,
      vendorGst: vendorGst || "",
      vendorPhone: vendorPhone || "",
      vendorAddress: vendorAddress || "",
      vendorCity: vendorCity || "",
      reason: reason || "Damaged Stock",
      deductFromInventory: deductFromInventory !== false,
      items: cleanedItems,
      subtotal: Number(subtotal) || 0,
      totalDiscount: Number(totalDiscount) || 0,
      cgst: Number(cgst) || 0,
      sgst: Number(sgst) || 0,
      igst: Number(igst) || 0,
      totalTax: Number(totalTax) || 0,
      roundOff: Number(roundOff) || 0,
      netAmount: Number(netAmount) || 0,
      remarks: remarks || "",
      status: "Approved",
      createdBy: "Admin",
    });

    return NextResponse.json({
      success: true,
      message: "Purchase Return (Debit Note) created successfully",
      purchaseReturn: newReturn,
    });
  } catch (error: any) {
    console.error("POST Purchase Return Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
    }

    const deleted = await PurchaseReturn.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Purchase return not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Purchase Return deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE Purchase Return Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}
