import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  const restriction = await getMrTerritoryRestriction();

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
    groupMap.set(String(g.ORDNO || "").trim(), g);
  });

  // Base customer records
  const allCustomers: any[] = await Customer.find(
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
      COMPANY: 1,
      GCODE: 1,
      DSM: 1,
    }
  )
    .sort({ PARNAM: 1 })
    .lean();

  const customers = restriction.isMrRestricted
    ? allCustomers.filter((c: any) => restriction.isPartyAllowed(c))
    : allCustomers;

  // Merge Group Information
  const result = customers.map((c: any) => {
    const scode = String(c.SCODE || "").trim();
    const grp = groupMap.get(scode);

    return {
      ...c,
      GROUPCODE: scode,
      GROUPNAME: grp?.PARNAM || "",
      MAINGROUP: grp?.GROUP || "",
      PARENTGROUP: grp?.GCODE || "",
    };
  });

  return NextResponse.json(result);
}