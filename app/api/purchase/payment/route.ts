import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchasePayment from "@/models/PurchasePayment";
import PurchaseBill from "@/models/PurchaseBill";
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

    // Action 1: Next Voucher Number
    if (action === "nextNumber") {
      const nextVcn = await peekNextVoucherNumber("PAYMENT");
      return NextResponse.json({ success: true, nextVcn });
    }

    // Action 2: Summary Metrics
    if (action === "metrics") {
      const today = todayStr();
      const [totalAgg, todayAgg, pendingAgg] = await Promise.all([
        PurchasePayment.aggregate([
          { $group: { _id: null, totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]),
        PurchasePayment.aggregate([
          { $match: { paymentDate: today } },
          { $group: { _id: null, totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]),
        PurchaseBill.aggregate([
          { $match: { paymentStatus: { $ne: "Paid" } } },
          { $group: { _id: null, totalPending: { $sum: "$balanceAmount" }, count: { $sum: 1 } } }
        ])
      ]);

      return NextResponse.json({
        success: true,
        totalPaymentsAmount: totalAgg[0]?.totalAmount || 0,
        totalPaymentsCount: totalAgg[0]?.count || 0,
        todayPaymentsAmount: todayAgg[0]?.totalAmount || 0,
        todayPaymentsCount: todayAgg[0]?.count || 0,
        totalPendingPayable: pendingAgg[0]?.totalPending || 0,
        pendingBillsCount: pendingAgg[0]?.count || 0,
      });
    }

    // Action 3: Vendor Bills for settlement selection
    if (action === "vendorBills") {
      const vendorId = (searchParams.get("vendorId") || "").trim();
      const vendorName = (searchParams.get("vendorName") || "").trim();

      let query: any = {};
      if (vendorId) {
        query.$or = [{ vendorId }, { vendorCode: vendorId }];
      } else if (vendorName) {
        query.vendorName = new RegExp(vendorName, "i");
      }

      // Find bills that are not fully paid
      query.paymentStatus = { $ne: "Paid" };

      const bills = await PurchaseBill.find(query)
        .sort({ billDate: 1, createdAt: 1 })
        .lean();

      return NextResponse.json({
        success: true,
        bills: bills.map((b: any) => ({
          _id: String(b._id),
          billNumber: b.billNumber || b.supplierInvoiceNo,
          billDate: b.billDate,
          dueDate: b.dueDate || b.billDate,
          netAmount: b.netAmount || 0,
          paidAmount: b.paidAmount || 0,
          balanceAmount: typeof b.balanceAmount === "number" ? b.balanceAmount : ((b.netAmount || 0) - (b.paidAmount || 0)),
        })),
      });
    }

    // Action 4: Default List Payments with Pagination & Search
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
        { voucherNo: regex },
        { vendorName: regex },
        { vendorCode: regex },
        { refNo: regex },
        { paymentMode: regex },
      ];
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (companyId && companyId !== "ALL") {
      query.companyId = companyId;
    }

    const [payments, total] = await Promise.all([
      PurchasePayment.find(query).sort({ paymentDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      PurchasePayment.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("GET Purchase Payment Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      paymentDate,
      companyId,
      companyCode,
      fyId,
      fyCode,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorCity,
      amount,
      paymentMode,
      refNo,
      bankName,
      discountReceived,
      settledBills,
      remarks,
    } = body;

    if (!vendorName) {
      return NextResponse.json({ success: false, message: "Vendor/Supplier name is required" }, { status: 400 });
    }

    const payAmount = Number(amount) || 0;
    if (payAmount <= 0) {
      return NextResponse.json({ success: false, message: "Payment amount must be greater than 0" }, { status: 400 });
    }

    // Generate unique Voucher Number
    const voucherNo = await consumeNextVoucherNumber("PAYMENT");

    // Clean settled bills & update target PurchaseBill records
    const cleanedSettledBills: any[] = [];

    if (Array.isArray(settledBills) && settledBills.length > 0) {
      for (const sb of settledBills) {
        const setAmt = Number(sb.settledAmount) || 0;
        if (setAmt > 0 && sb.billId) {
          const bill = await PurchaseBill.findById(sb.billId);
          if (bill) {
            const currentPaid = bill.paidAmount || 0;
            const newPaid = currentPaid + setAmt;
            const netAmt = bill.netAmount || 0;
            const newBal = Math.max(0, netAmt - newPaid);

            bill.paidAmount = newPaid;
            bill.balanceAmount = newBal;
            bill.paymentStatus = newBal <= 0 ? "Paid" : "Partial";
            await bill.save();

            cleanedSettledBills.push({
              billId: String(bill._id),
              billNumber: bill.billNumber || sb.billNumber || "",
              originalAmount: netAmt,
              settledAmount: setAmt,
              remainingAmount: newBal,
            });
          }
        }
      }
    }

    const paymentVoucher = await PurchasePayment.create({
      voucherNo,
      paymentDate: paymentDate || todayStr(),
      companyId: companyId || "",
      companyCode: companyCode || "",
      fyId: fyId || "",
      fyCode: fyCode || "",
      vendorId: vendorId || "",
      vendorCode: vendorCode || "",
      vendorName,
      vendorGst: vendorGst || "",
      vendorPhone: vendorPhone || "",
      vendorCity: vendorCity || "",
      amount: payAmount,
      paymentMode: paymentMode || "Bank Transfer",
      refNo: refNo || "",
      bankName: bankName || "",
      discountReceived: Number(discountReceived) || 0,
      settledBills: cleanedSettledBills,
      remarks: remarks || "",
      status: "Approved",
      createdBy: "Admin",
    });

    return NextResponse.json({
      success: true,
      message: "Payment Voucher created successfully",
      paymentVoucher,
    });
  } catch (error: any) {
    console.error("POST Purchase Payment Error:", error);
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

    const payment = await PurchasePayment.findById(id);
    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment voucher not found" }, { status: 404 });
    }

    // Revert bill balances
    if (Array.isArray(payment.settledBills) && payment.settledBills.length > 0) {
      for (const sb of payment.settledBills) {
        if (sb.billId && sb.settledAmount > 0) {
          const bill = await PurchaseBill.findById(sb.billId);
          if (bill) {
            const currentPaid = bill.paidAmount || 0;
            const newPaid = Math.max(0, currentPaid - sb.settledAmount);
            const netAmt = bill.netAmount || 0;
            const newBal = netAmt - newPaid;

            bill.paidAmount = newPaid;
            bill.balanceAmount = newBal;
            bill.paymentStatus = newPaid === 0 ? "Pending" : newBal <= 0 ? "Paid" : "Partial";
            await bill.save();
          }
        }
      }
    }

    await PurchasePayment.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Payment Voucher deleted and bill balances restored successfully",
    });
  } catch (error: any) {
    console.error("DELETE Purchase Payment Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}
