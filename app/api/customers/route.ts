import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";

export async function GET() {
  await connectDB();

  // Load all account groups
  const groups = await AccountGroup.find(
    {},
    {
      ORDNO: 1,
      PARNAM: 1,
      GROUP: 1,
      GCODE: 1,
    }
  ).lean();

  // Create Map
  const groupMap = new Map<string, any>();

  groups.forEach((g: any) => {
    groupMap.set(g.ORDNO, g);
  });

  // Customers
  const customers: any[] = await Customer.find(
    {},
    {
      PARNAM: 1,
      ORDNO: 1,
      SCODE: 1,
      CODEP: 1,
      CITY: 1,
      PHONE1: 1,
      GSTNO: 1,
      DLNO: 1,
      BALANCE: 1,
      STATUS: 1,
    }
  )
    .sort({ PARNAM: 1 })
    .lean();

  // Merge Group Information
  const result = customers.map((c: any) => {
    const grp = groupMap.get(c.SCODE);

    return {
      ...c,

      GROUPCODE: c.SCODE || "",

      GROUPNAME: grp?.PARNAM || "",

      MAINGROUP: grp?.GROUP || "",

      PARENTGROUP: grp?.GCODE || "",
    };
  });

  return NextResponse.json(result);
}