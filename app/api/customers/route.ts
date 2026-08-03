import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const companyVfpMatch = await getCompanyVfpFilter(searchParams);
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
    combineFilters(companyVfpMatch),
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
      GSTHED: 1,
      STATE: 1,
      PRICE: 1,
      SALDR: 1,
    }
  )
    .sort({ PARNAM: 1 })
    .lean();

  const customers = restriction.isMrRestricted
    ? allCustomers.filter((c: any) => restriction.isPartyAllowed(c))
    : allCustomers;

  // Merge Group Information & Format Active/Inactive Status
  const result = customers.map((c: any) => {
    const scode = String(c.SCODE || "").trim();
    const grp = groupMap.get(scode);
    const isActive = c.STATUS === "N" || c.SALDR === "N" ? "N" : "Y";

    return {
      ...c,
      STATUS: isActive,
      GROUPCODE: scode,
      GROUPNAME: grp?.PARNAM || "",
      MAINGROUP: grp?.GROUP || "",
      PARENTGROUP: grp?.GCODE || "",
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.PARNAM || !String(body.PARNAM).trim()) {
      return NextResponse.json(
        { success: false, message: "Party / Customer Name (PARNAM) is required" },
        { status: 400 }
      );
    }

    const numericFields = [
      "BALANCE", "CREDIT", "DEBIT", "OPNING", "OPENING", "CLBAL", "DISCOUNT",
      "DUEDAYS", "DAYS", "FINAL"
    ];

    const customerData: Record<string, any> = {};

    // Copy incoming fields
    Object.keys(body).forEach((key) => {
      if (body[key] !== undefined && body[key] !== null) {
        customerData[key] = body[key];
      }
    });

    customerData.PARNAM = String(body.PARNAM).trim();
    customerData.CODEP = body.CODEP && String(body.CODEP).trim()
      ? String(body.CODEP).trim()
      : `CUST_${Date.now().toString().slice(-6)}`;
    customerData.ORDNO = customerData.CODEP;
    customerData.SALDR = "Y"; // Customer flag
    customerData.STATUS = body.STATUS || "Y";

    // Provide unique VFP keys to avoid E11000 index collision on {_vfpTable: null, _vfpSourceKey: null}
    customerData._vfpTable = body._vfpTable || "vfp_new_folder_order";
    customerData._vfpSourceKey = body._vfpSourceKey || `MANUAL_CUST_${customerData.CODEP}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Convert numeric fields properly
    numericFields.forEach((field) => {
      if (field in body && body[field] !== "" && body[field] !== null && body[field] !== undefined) {
        const num = Number(body[field]);
        customerData[field] = isNaN(num) ? 0 : num;
      }
    });

    const newCustomer = await Customer.create(customerData);

    return NextResponse.json(
      { success: true, message: "Customer created successfully", data: newCustomer },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}