import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesHierarchy from "@/models/SalesHierarchy";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// =======================
// GET - List Sales Hierarchy Records
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const roleLevel = searchParams.get("roleLevel") || "";
    const reportsTo = searchParams.get("reportsTo") || "";
    const state = searchParams.get("state") || "";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const filter: any = {};

    if (roleLevel) filter.roleLevel = roleLevel;
    if (reportsTo) filter.reportsTo = reportsTo;
    if (state) filter.state = { $regex: state, $options: "i" };
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
        { region: { $regex: search, $options: "i" } },
        { territory: { $regex: search, $options: "i" } },
        { reportsToName: { $regex: search, $options: "i" } },
      ];
    }

    const records = await SalesHierarchy.find(filter)
      .populate("userId", "name email employeeCode mobile designation")
      .populate("reportsTo", "name email employeeCode designation")
      .sort({ roleLevel: 1, userName: 1 });

    return NextResponse.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch sales hierarchy" },
      { status: 500 }
    );
  }
}

// =======================
// POST - Create Sales Hierarchy Assignment
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      userId,
      roleLevel,
      state,
      zone,
      region,
      territory,
      reportsTo,
      assignedCompanyCodes,
      assignedDivisionCodes,
      notes,
      status,
    } = body;

    // Required validation
    if (!userId || !roleLevel) {
      return NextResponse.json(
        {
          success: false,
          message: "User and Role Level (ZSM/RSM/MR) are required.",
        },
        { status: 400 }
      );
    }

    // Validate User exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Selected Executive User not found." },
        { status: 404 }
      );
    }

    // Validate Parent Manager exists if reportsTo provided
    let reportsToName = "";
    if (reportsTo) {
      const parentManager = await User.findById(reportsTo);
      if (parentManager) {
        reportsToName = parentManager.name;
      }
    }

    // Check duplicate assignment
    const duplicate = await SalesHierarchy.findOne({
      userId,
      roleLevel,
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: `This user is already assigned a hierarchy role as ${roleLevel}.`,
        },
        { status: 400 }
      );
    }

    const hierarchyRecord = await SalesHierarchy.create({
      userId,
      userName: user.name,
      employeeCode: user.employeeCode || "",
      roleLevel,
      state: (state || "").trim(),
      zone: (zone || "").trim(),
      region: (region || "").trim(),
      territory: (territory || "").trim(),
      reportsTo: reportsTo || null,
      reportsToName,
      assignedCompanyCodes: Array.isArray(assignedCompanyCodes) ? assignedCompanyCodes : [],
      assignedDivisionCodes: Array.isArray(assignedDivisionCodes) ? assignedDivisionCodes : [],
      notes: (notes || "").trim(),
      status: status || "Active",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Sales Hierarchy record created successfully.",
        data: hierarchyRecord,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create sales hierarchy record" },
      { status: 500 }
    );
  }
}
