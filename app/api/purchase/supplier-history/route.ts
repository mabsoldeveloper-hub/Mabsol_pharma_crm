import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchaseBill from "@/models/PurchaseBill";
import Pendings from "@/models/Pendings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const vendorName = (searchParams.get("vendorName") || searchParams.get("name") || "").trim();
    const vendorCode = (searchParams.get("vendorCode") || searchParams.get("code") || "").trim();
    const vendorId = (searchParams.get("vendorId") || "").trim();

    if (!vendorName && !vendorCode && !vendorId) {
      return NextResponse.json({
        success: true,
        history: null,
      });
    }

    const nameRegex = vendorName ? new RegExp(vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") : null;
    const codeRegex = vendorCode ? new RegExp(`^${vendorCode.trim()}$`, "i") : null;

    const vendorMatch: any[] = [];
    if (vendorId) vendorMatch.push({ vendorId });
    if (vendorCode) vendorMatch.push({ vendorCode: codeRegex });
    if (vendorName) vendorMatch.push({ vendorName: nameRegex });

    const query = vendorMatch.length > 0 ? { $or: vendorMatch } : {};

    // 1. Fetch Purchase Orders for this Supplier
    const pastOrders = await PurchaseOrder.find(query).sort({ createdAt: -1 }).limit(10).lean();

    // 2. Fetch Purchase Bills for this Supplier
    const pastBills = await PurchaseBill.find(query).sort({ createdAt: -1 }).limit(10).lean();

    // 3. Fetch Pendings / Outstanding for this Supplier from Pendings collection
    const pendingQuery: any[] = [];
    if (vendorName) pendingQuery.push({ NAME: nameRegex });
    if (vendorCode) {
      pendingQuery.push({ ORD: codeRegex });
      pendingQuery.push({ CODEP: codeRegex });
    }

    const pendingDocs = pendingQuery.length > 0
      ? await Pendings.find({ ACGROUP: /^D/i, INVTYPE: "I", $or: pendingQuery }).lean()
      : [];

    let totalPurchasedAmount = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    const todayMs = new Date().getTime();

    pastBills.forEach((b: any) => {
      totalPurchasedAmount += Number(b.netAmount || 0);
      totalOutstanding += Number(b.balanceAmount || 0);
    });

    pendingDocs.forEach((p: any) => {
      const balance = Number(p.BALANCE || 0);
      if (balance < 0) {
        const absBal = Math.abs(balance);
        totalOutstanding += absBal;

        const ddateStr = p.DDATE ? String(p.DDATE).slice(0, 10) : "";
        if (ddateStr && (todayMs - new Date(ddateStr).getTime()) > 0) {
          overdueAmount += absBal;
        }
      }
    });

    const lastOrderDate = pastOrders[0]?.poDate || pastBills[0]?.billDate || "N/A";

    return NextResponse.json({
      success: true,
      summary: {
        totalOrdersCount: pastOrders.length,
        totalBillsCount: pastBills.length,
        totalPurchasedAmount,
        totalOutstanding,
        overdueAmount,
        lastOrderDate,
      },
      recentOrders: pastOrders.map((po: any) => ({
        id: po._id,
        poNumber: po.poNumber,
        poDate: po.poDate,
        itemsCount: po.items?.length || 0,
        netTotal: po.netTotal || 0,
        status: po.status,
      })),
      recentBills: pastBills.map((b: any) => ({
        id: b._id,
        billNumber: b.billNumber,
        supplierInvoiceNo: b.supplierInvoiceNo || "N/A",
        billDate: b.billDate,
        netAmount: b.netAmount || 0,
        balanceAmount: b.balanceAmount || 0,
        paymentStatus: b.paymentStatus,
      })),
    });
  } catch (error: any) {
    console.error("Supplier History API Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server Error" },
      { status: 500 }
    );
  }
}
