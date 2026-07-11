
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import Order from "@/models/Order";

export async function GET() {
  try {
    await connectDB();

    // Bill Master
    const bills = await SalesMdis.find(
      {},
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