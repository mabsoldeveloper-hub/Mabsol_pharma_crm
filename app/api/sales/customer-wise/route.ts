
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import Order from "@/models/Order";

import FinancialYear from "@/models/FinancialYear";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const fyId = searchParams.get("fyId");

    if (!startDate || !endDate) {
      let currentFY = null;
      if (fyId && fyId !== "ALL") {
        currentFY = await FinancialYear.findById(fyId);
      } else if (fyId !== "ALL") {
        currentFY = await FinancialYear.findOne({ isCurrent: true });
      }
      if (currentFY) {
        startDate = currentFY.startDate ? new Date(currentFY.startDate).toISOString().slice(0, 10) : null;
        endDate = currentFY.endDate ? new Date(currentFY.endDate).toISOString().slice(0, 10) : null;
      }
    }

    const dateMatch: any = (startDate && endDate) ? { DATE: { $gte: startDate, $lte: endDate } } : {};

    // Bill Master
    const bills = await SalesMdis.find(
      dateMatch,
      {
        CODEP: 1,
        FINAL: 1,
        DATE: 1,
      }
    ).lean();

    // Customer Master
    const orders = await Order.find(
      {},
      {
        ORDNO: 1,
        PARNAM: 1,
        CITY: 1,
      }
    ).lean();

    // Customer Map
    const orderMap = new Map();

    orders.forEach((o: any) => {
      if (o.ORDNO) {
        orderMap.set(String(o.ORDNO).trim(), o);
      }
    });

    const customerMap = new Map();

    bills.forEach((bill: any) => {
      const code =
        String(bill.CODEP || "").trim();

      const customer =
        orderMap.get(code);

      if (!customer) return;

      if (!customerMap.has(code)) {
        customerMap.set(code, {
          code,

          customer:
            customer.PARNAM || "",

          city:
            customer.CITY || "",

          bills: 0,

          amount: 0,

          lastBill:
            bill.DATE || "",
        });
      }

      const row =
        customerMap.get(code);

      row.bills += 1;

      row.amount += Number(
        bill.FINAL || 0
      );

      if (bill.DATE) {
        row.lastBill =
          bill.DATE;
      }
    });

    const result = Array.from(
      customerMap.values()
    ).sort(
      (a: any, b: any) =>
        b.amount - a.amount
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}