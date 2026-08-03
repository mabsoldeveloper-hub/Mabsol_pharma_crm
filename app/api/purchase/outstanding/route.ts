// import { NextResponse } from "next/server";
// import connectDB from "@/lib/mongodb";
// import Pendings from "@/models/Pendings";
// import Order from "@/models/Order";
// import Customer from "@/models/Customer";
// import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
// import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

// export async function GET(req: Request) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(req.url);
//     const fyRange = await getFYDateRange(searchParams);
//     const { startDate, endDate } = fyRange;

//     const dateMatch = buildFYDateQuery("DDATE", startDate, endDate);
//     const restriction = await getMrTerritoryRestriction();

//     // Purchase Outstanding (Creditors) = ACGROUP starts with 'D' (e.g. D34), INVTYPE='I' in Pendings
//     let filter: any = {
//       ACGROUP: /^D/i,
//       INVTYPE: "I",
//       ...dateMatch,
//     };

//     if (restriction.isMrRestricted) {
//       if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
//         filter.ORD = { $in: restriction.allowedOrdnos };
//       } else {
//         filter.ORD = "NONE_MATCH";
//       }
//     }

//     const pendingBills = await Pendings.find(filter)
//       .sort({ DDATE: -1, _id: -1 })
//       .lean();

//     const screenshot2Vcns = ["A000031", "A000178", "A000043", "A000091", "A000123", "A000144", "0146", "0073", "A000223", "A00077", "A000317", "A000324", "A000348", "KB-000264", "A000502"];
//     const filteredBills = pendingBills.filter((r: any) =>
//       screenshot2Vcns.some((v) => String(r.VCN || r.VOUCHER || "").includes(v))
//     );

//     const displayBills = filteredBills.length > 0 ? filteredBills : pendingBills;

//     // Fetch Order & Customer masters to enrich with party details if NAME is missing
//     const [orders, customers] = await Promise.all([
//       Order.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1, GSTNO: 1, PHONE: 1 }).lean(),
//       Customer.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1, GSTNO: 1, PHONE: 1 }).lean(),
//     ]);

//     const partyMap = new Map<string, any>();
//     const addParty = (item: any) => {
//       const obj = {
//         name: item.PARNAM || item.NAME || "",
//         city: item.CITY || "",
//         gst: item.GSTNO || "",
//         phone: item.PHONE || "",
//       };
//       [item.ORDNO, item.CODEP, item.SCODE, item.CODE].forEach((k) => {
//         if (k) {
//           const key = String(k).trim().toUpperCase();
//           if (key && !partyMap.has(key)) partyMap.set(key, obj);
//         }
//       });
//     };

//     orders.forEach(addParty);
//     customers.forEach(addParty);

//     const todayStr = new Date().toISOString().slice(0, 10);
//     const todayMs = new Date(todayStr).getTime();

//     let totalAmount = 0;
//     let overdueCount = 0;
//     let overdueAmount = 0;

//     const result = displayBills.map((b: any) => {
//       const codeKey = String(b.ORD || b.CODEP || b.CODE || "").trim().toUpperCase();
//       const party = partyMap.get(codeKey);

//       const ddateStr = b.DDATE ? String(b.DDATE).slice(0, 10) : "";
//       const finalAmt = Math.abs(Number(b.BALANCE || b.FINAL || 0));
//       totalAmount += finalAmt;

//       let overdueDays = 0;
//       if (ddateStr) {
//         const billMs = new Date(ddateStr).getTime();
//         const diffMs = todayMs - billMs;
//         if (diffMs > 0) {
//           overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
//           overdueCount++;
//           overdueAmount += finalAmt;
//         }
//       }

//       return {
//         _id: b._id,
//         vcn: b.VCN || b.VOUCHER || "",
//         voucher: b.VOUCHER || b.VCN || "",
//         date: ddateStr,
//         ddate: ddateStr,
//         ord: b.ORD || b.CODEP || "",
//         supplier: b.NAME || party?.name || b.ORD || b.CODEP || "Supplier Account",
//         city: party?.city || b.AREA || "",
//         gst: party?.gst || "",
//         phone: party?.phone || "",
//         amount: finalAmt,
//         overdueDays: b.DUEDAYS || overdueDays,
//         status: (b.DUEDAYS > 0 || overdueDays > 0) ? "Overdue" : "Pending",
//       };
//     });

//     return NextResponse.json({
//       success: true,
//       totalBills: result.length,
//       totalAmount,
//       overdueCount,
//       overdueAmount,
//       rows: result,
//     });
//   } catch (error: any) {
//     console.error("Purchase Outstanding API error:", error);
//     return NextResponse.json(
//       { success: false, message: error.message || "Failed to fetch purchase outstanding" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

import Pendings from "@/models/Pendings";
import Pend from "@/models/Pend";
import Order from "@/models/Order";
import Customer from "@/models/Customer";

import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import {
  getFYDateRange,
  buildFYDateQuery,
} from "@/lib/financialYearHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);

    const fyRange = await getFYDateRange(searchParams);
    const { startDate, endDate } = fyRange;

    const dateMatch = buildFYDateQuery("DDATE", startDate, endDate);

    const restriction = await getMrTerritoryRestriction();

    const filter: any = combineFilters({
      ACGROUP: /^D/i,
      INVTYPE: "I",
    }, dateMatch, companyVfpMatch);

    if (restriction.isMrRestricted) {
      if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
        filter.ORD = { $in: restriction.allowedOrdnos };
      } else {
        filter.ORD = "NONE_MATCH";
      }
    }

    const [pendingBills, pendRows, orders, customers] =
      await Promise.all([
        Pendings.find(filter)
          .sort({ DDATE: -1, _id: -1 })
          .lean(),

        Pend.find({}).lean(),

        Order.find(
          {},
          {
            ORDNO: 1,
            CODEP: 1,
            PARNAM: 1,
            NAME: 1,
            CITY: 1,
            GSTNO: 1,
            PHONE: 1,
          }
        ).lean(),

        Customer.find(
          {},
          {
            ORDNO: 1,
            CODEP: 1,
            PARNAM: 1,
            NAME: 1,
            CITY: 1,
            GSTNO: 1,
            PHONE: 1,
          }
        ).lean(),
      ]);

    console.log("Pending Bills :", pendingBills.length);
    console.log("Pend Rows :", pendRows.length);

    // ----------------------------
    // Party Lookup
    // ----------------------------

    const partyMap = new Map<string, any>();

    const addParty = (row: any) => {
      const obj = {
        name: row.PARNAM || row.NAME || "",
        city: row.CITY || "",
        gst: row.GSTNO || "",
        phone: row.PHONE || "",
      };

      [row.ORDNO, row.CODEP, row.SCODE, row.CODE].forEach((key) => {
        if (!key) return;

        const k = String(key).trim().toUpperCase();

        if (!partyMap.has(k)) {
          partyMap.set(k, obj);
        }
      });
    };

    orders.forEach(addParty);
    customers.forEach(addParty);

    // ----------------------------
    // Filter Bills
    // ----------------------------

    const billRows = pendingBills.filter((bill: any) => {
      const balance = Number(bill.BALANCE ?? 0);

      // In Marg/VFP database, Creditor Purchase Invoices have negative BALANCE (BALANCE < 0)
      if (balance >= 0) return false;

      return true;
    });

    console.log("Bill Rows :", billRows.length);

    // ----------------------------
    // Adjustment Map
    // ----------------------------

    const adjustmentMap = new Map<number, any[]>();

    for (const row of pendRows) {
      if (row.TYPE !== "A") continue;

      const key = Number(row.ADJVOUCHER);

      if (!adjustmentMap.has(key)) {
        adjustmentMap.set(key, []);
      }

      adjustmentMap.get(key)!.push(row);
    }

    // ----------------------------
    // Date Helpers
    // ----------------------------

    const today = new Date();
    const todayMs = new Date(
      today.toISOString().slice(0, 10)
    ).getTime();

    // ----------------------------
    // Totals
    // ----------------------------

    let totalBills = 0;
    let totalBillValue = 0;
    let totalReceive = 0;
    let totalBalance = 0;
    let overdueBills = 0;
    let overdueAmount = 0;

    // ----------------------------
    // Build Result
    // ----------------------------

    const result = billRows.map((bill: any) => {

      const voucher = Number(bill.VOUCHER ?? 0);
      const linkedAdjustments = adjustmentMap.get(voucher) ?? [];

      const rawFinal = Math.abs(Number(bill.FINAL ?? 0));
      const balance = Math.abs(Number(bill.BALANCE ?? 0));
      const billValue = rawFinal > 0 ? rawFinal : balance;
      const receive = Math.max(0, billValue - balance);

      totalBills++;
      totalBillValue += billValue;
      totalReceive += receive;
      totalBalance += balance;

      const codeKey = String(
        bill.ORD || bill.CODEP || bill.CODE || ""
      )
        .trim()
        .toUpperCase();

      const party = partyMap.get(codeKey);

      const billDate = bill.DDATE
        ? String(bill.DDATE).slice(0, 10)
        : "";

      const dueDate = bill.DUEDATE
        ? String(bill.DUEDATE).slice(0, 10)
        : billDate;

      let overdueDays = Number(bill.DUEDAYS ?? 0);

      if (!overdueDays && dueDate) {
        const dueMs = new Date(dueDate).getTime();
        const diff = todayMs - dueMs;

        if (diff > 0) {
          overdueDays = Math.floor(
            diff / (1000 * 60 * 60 * 24)
          );
        }
      }

      if (overdueDays > 0) {
        overdueBills++;
        overdueAmount += balance;
      }

      const adjustmentDetails = linkedAdjustments.map((adj: any) => ({
        vcn: adj.VCN,
        voucher: adj.VOUCHER,
        adjVoucher: adj.ADJVOUCHER,
        svoucher: adj.SVOUCHER,
        type: adj.TYPE,
        amount: Number(adj.FINAL ?? 0),
        date: adj.DDATE
          ? String(adj.DDATE).slice(0, 10)
          : "",
      }));

      return {
        _id: bill._id,

        vcn: bill.VCN || bill.VOUCHER,

        voucher: bill.VOUCHER,

        svoucher: bill.SVOUCHER,

        ord: bill.ORD || "",

        supplier:
          bill.NAME ||
          party?.name ||
          "Supplier Account",

        city: party?.city || bill.AREA || "",

        gst: party?.gst || "",

        phone: party?.phone || "",

        billDate,

        dueDate,

        overdueDays,

        status:
          overdueDays > 0
            ? "Overdue"
            : "Pending",

        billValue,

        receive,

        balance,

        adjustmentCount:
          adjustmentDetails.length,

        adjustments: adjustmentDetails,
      };
    });

    // ----------------------------
    // Sort
    // ----------------------------

    result.sort((a, b) => {
      if (a.overdueDays !== b.overdueDays) {
        return b.overdueDays - a.overdueDays;
      }

      return b.billValue - a.billValue;
    });

    // ----------------------------
    // Response
    // ----------------------------

    return NextResponse.json({
      success: true,

      rows: result,

      summary: {
        totalBills,
        totalBillValue,
        totalReceive,
        totalBalance,
        overdueBills,
        overdueAmount,
      },
    });

  } catch (error: any) {

    console.error("Pending Bills API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}