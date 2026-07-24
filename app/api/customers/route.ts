import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";
import MrTerritory from "@/models/MrTerritory";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  // ── Step 1: Determine MR territory restrictions ───────────────────────
  let allowedSCODEs: string[] | null = null;

  try {
    const user = await getCurrentUser();

    if (user) {
      const roleName = String(user.roleId?.roleName || "").trim().toLowerCase();

      // Admin role users get FULL access to all customers
      if (roleName.includes("admin")) {
        allowedSCODEs = null;
      } else {
        const territories = await MrTerritory.find(
          { userId: user._id, status: "Active" },
          { companyCode: 1 }
        );

        if (territories && territories.length > 0) {
          allowedSCODEs = Array.from(
            new Set(
              territories.map((t: any) => String(t.companyCode || "").trim())
            )
          ).filter(Boolean);
        }
      }
    }
  } catch {
    allowedSCODEs = null;
  }

  // ── Step 2: Build customer query with optional SCODE filter ────────────
  const customerFilter: any = {};
  if (allowedSCODEs !== null && allowedSCODEs.length > 0) {
    customerFilter.SCODE = { $in: allowedSCODEs };
  } else if (allowedSCODEs !== null && allowedSCODEs.length === 0) {
    return NextResponse.json([]);
  }

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
    customerFilter,
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