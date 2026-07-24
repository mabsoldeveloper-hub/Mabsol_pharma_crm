import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";
import MrTerritory from "@/models/MrTerritory";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import { getCurrentUser } from "@/lib/auth";


export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  // ── Step 1: Determine MR territory restrictions ───────────────────────
  let customerFilter: any = {};

  try {
    const user = await getCurrentUser();

    if (user) {
      const roleName = String(user.roleId?.roleName || "").trim().toLowerCase();

      // Admin role users get FULL access to all customers
      if (roleName.includes("admin")) {
        customerFilter = {};
      } else {
        const territories = await MrTerritory.find(
          { userId: user._id, status: "Active" },
          { companyCode: 1 }
        );

        if (territories && territories.length > 0) {
          const allowedCompanyCodes = Array.from(
            new Set(
              territories.map((t: any) => String(t.companyCode || "").trim())
            )
          ).filter(Boolean);

          const userName = String(user.name || "").trim();
          const empCode = String(user.employeeCode || "").trim();

          const dsmConditions: any[] = [];
          if (userName) dsmConditions.push({ DSM: { $regex: userName, $options: "i" } });
          if (empCode) dsmConditions.push({ DSM: { $regex: empCode, $options: "i" } });

          const [disCodes, mdisCodes, directOrdnos] = await Promise.all([
            SalesDis.distinct("CODEP", { COMPANY: { $in: allowedCompanyCodes } }),
            SalesMdis.distinct("CODEP", { COMPANY: { $in: allowedCompanyCodes } }),
            Customer.distinct("ORDNO", {
              $or: [
                { COMPANY: { $in: allowedCompanyCodes } },
                { GCODE: { $in: allowedCompanyCodes } },
                { SCODE: { $in: allowedCompanyCodes } },
                ...(dsmConditions.length > 0 ? dsmConditions : []),
              ],
            }),
          ]);

          const allMatchedOrdnos = Array.from(
            new Set(
              [
                ...disCodes.map((c: any) => String(c).trim()),
                ...mdisCodes.map((c: any) => String(c).trim()),
                ...directOrdnos.map((c: any) => String(c).trim()),
              ].filter(Boolean)
            )
          );

          if (allMatchedOrdnos.length > 0) {
            customerFilter.ORDNO = { $in: allMatchedOrdnos };
          } else {
            return NextResponse.json([]);
          }
        }
      }
    }
  } catch {
    customerFilter = {};
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