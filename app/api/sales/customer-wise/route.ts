
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import Order from "@/models/Order";
import Customer from "@/models/Customer";

import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const fyRange = await getFYDateRange(searchParams);
    const { startDate, endDate } = fyRange;

    const dateMatch = buildFYDateQuery("DATE", startDate, endDate);
    const restriction = await getMrTerritoryRestriction();

    let billMatch: any = { ...dateMatch, TYPE: { $nin: ["PROFORMA", "ESTIMATE"] } };
    if (restriction.isMrRestricted) {
      const orConditions: any[] = [];
      if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
        orConditions.push({ CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
      }
      if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
        orConditions.push({ COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } });
      }
      if (orConditions.length > 0) {
        billMatch = { ...dateMatch, TYPE: { $nin: ["PROFORMA", "ESTIMATE"] }, $or: orConditions };
      } else {
        billMatch = { ...dateMatch, TYPE: { $nin: ["PROFORMA", "ESTIMATE"] }, CODEP: "NONE_MATCH" };
      }
    }

    // Bill Master
    const bills = await SalesMdis.find(
      billMatch,
      {
        CODEP: 1,
        FINAL: 1,
        AMOUNTT: 1,
        DATE: 1,
      }
    ).lean();

    // Customer / Order Master
    const [orders, customers] = await Promise.all([
      Order.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1 }).lean(),
      Customer.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1 }).lean(),
    ]);

    // Build unified Customer Map (Key: CODEP/ORDNO)
    const partyMap = new Map<string, any>();

    const addParty = (item: any) => {
      const name = item.PARNAM || item.NAME || "";
      const city = item.CITY || "";
      const obj = { name, city };

      [item.CODEP, item.ORDNO, item.SCODE, item.CODE].forEach((k) => {
        if (k) {
          const key = String(k).trim().toUpperCase();
          if (key && !partyMap.has(key)) {
            partyMap.set(key, obj);
          }
        }
      });
    };

    orders.forEach(addParty);
    customers.forEach(addParty);

    const customerSummaryMap = new Map<string, any>();

    bills.forEach((bill: any) => {
      const rawCode = String(bill.CODEP || "WALK-IN").trim();
      const codeKey = rawCode.toUpperCase();

      const party = partyMap.get(codeKey);
      const custName = party?.name || rawCode;
      const custCity = party?.city || "";

      const groupKey = `${codeKey}_${custName}`;

      if (!customerSummaryMap.has(groupKey)) {
        customerSummaryMap.set(groupKey, {
          code: rawCode,
          customer: custName,
          city: custCity,
          bills: 0,
          amount: 0,
          lastBill: bill.DATE || "",
        });
      }

      const row = customerSummaryMap.get(groupKey);

      row.bills += 1;
      row.amount += Number(bill.FINAL || bill.AMOUNTT || 0);

      if (bill.DATE) {
        row.lastBill = bill.DATE;
      }
    });

    const result = Array.from(customerSummaryMap.values()).sort(
      (a: any, b: any) => b.amount - a.amount
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