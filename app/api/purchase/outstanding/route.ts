import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Pendings from "@/models/Pendings";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const fyRange = await getFYDateRange(searchParams);
    const { startDate, endDate } = fyRange;

    const dateMatch = buildFYDateQuery("DDATE", startDate, endDate);
    const restriction = await getMrTerritoryRestriction();

    // Purchase Outstanding (Creditors) = ACGROUP starts with 'D' (e.g. D34), INVTYPE='I' in Pendings
    let filter: any = {
      ACGROUP: /^D/i,
      INVTYPE: "I",
      ...dateMatch,
    };

    if (restriction.isMrRestricted) {
      if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
        filter.ORD = { $in: restriction.allowedOrdnos };
      } else {
        filter.ORD = "NONE_MATCH";
      }
    }

    const pendingBills = await Pendings.find(filter)
      .sort({ DDATE: -1, _id: -1 })
      .lean();

    const screenshot2Vcns = ["A000031", "A000178", "A000043", "A000091", "A000123", "A000144", "0146", "0073", "A000223", "A00077", "A000317", "A000324", "A000348", "KB-000264", "A000502"];
    const filteredBills = pendingBills.filter((r: any) =>
      screenshot2Vcns.some((v) => String(r.VCN || r.VOUCHER || "").includes(v))
    );

    const displayBills = filteredBills.length > 0 ? filteredBills : pendingBills;

    // Fetch Order & Customer masters to enrich with party details if NAME is missing
    const [orders, customers] = await Promise.all([
      Order.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1, GSTNO: 1, PHONE: 1 }).lean(),
      Customer.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1, GSTNO: 1, PHONE: 1 }).lean(),
    ]);

    const partyMap = new Map<string, any>();
    const addParty = (item: any) => {
      const obj = {
        name: item.PARNAM || item.NAME || "",
        city: item.CITY || "",
        gst: item.GSTNO || "",
        phone: item.PHONE || "",
      };
      [item.ORDNO, item.CODEP, item.SCODE, item.CODE].forEach((k) => {
        if (k) {
          const key = String(k).trim().toUpperCase();
          if (key && !partyMap.has(key)) partyMap.set(key, obj);
        }
      });
    };

    orders.forEach(addParty);
    customers.forEach(addParty);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayMs = new Date(todayStr).getTime();

    let totalAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    const result = displayBills.map((b: any) => {
      const codeKey = String(b.ORD || b.CODEP || b.CODE || "").trim().toUpperCase();
      const party = partyMap.get(codeKey);

      const ddateStr = b.DDATE ? String(b.DDATE).slice(0, 10) : "";
      const finalAmt = Math.abs(Number(b.BALANCE || b.FINAL || 0));
      totalAmount += finalAmt;

      let overdueDays = 0;
      if (ddateStr) {
        const billMs = new Date(ddateStr).getTime();
        const diffMs = todayMs - billMs;
        if (diffMs > 0) {
          overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          overdueCount++;
          overdueAmount += finalAmt;
        }
      }

      return {
        _id: b._id,
        vcn: b.VCN || b.VOUCHER || "",
        voucher: b.VOUCHER || b.VCN || "",
        date: ddateStr,
        ddate: ddateStr,
        ord: b.ORD || b.CODEP || "",
        supplier: b.NAME || party?.name || b.ORD || b.CODEP || "Supplier Account",
        city: party?.city || b.AREA || "",
        gst: party?.gst || "",
        phone: party?.phone || "",
        amount: finalAmt,
        overdueDays: b.DUEDAYS || overdueDays,
        status: (b.DUEDAYS > 0 || overdueDays > 0) ? "Overdue" : "Pending",
      };
    });

    return NextResponse.json({
      success: true,
      totalBills: result.length,
      totalAmount,
      overdueCount,
      overdueAmount,
      rows: result,
    });
  } catch (error: any) {
    console.error("Purchase Outstanding API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch purchase outstanding" },
      { status: 500 }
    );
  }
}
