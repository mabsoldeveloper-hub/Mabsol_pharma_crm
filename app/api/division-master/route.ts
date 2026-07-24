import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Division from "@/models/Division";
import Company from "@/models/Company";


// =======================
// GET - List Divisions
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const companyId = searchParams.get("companyId") || "";

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (companyId) {
      filter.companyId = companyId;
    }

    if (search) {
      filter.$or = [
        { divisionCode: { $regex: search, $options: "i" } },
        { divisionName: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } },
      ];
    }

    const divisions = await Division.find(filter)
      .populate("companyId", "companyName companyCode")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: divisions.length,
      data: divisions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}


// =======================
// POST - Create Division
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      companyId,
      divisionCode,
      divisionName,
      shortName,
      description,
      status,
    } = body;

    // Validation
    if (!companyId || !divisionCode || !divisionName) {
      return NextResponse.json(
        {
          success: false,
          message: "Company, Division Code and Division Name are required.",
        },
        { status: 400 }
      );
    }

    // Company Exists
    const company = await Company.findById(companyId);

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message: "Company not found.",
        },
        { status: 404 }
      );
    }

    // Duplicate Code
    const codeExists = await Division.findOne({
      companyId,
      divisionCode: divisionCode.trim().toUpperCase(),
    });

    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Division Code already exists.",
        },
        { status: 400 }
      );
    }

    // Duplicate Name
    const nameExists = await Division.findOne({
      companyId,
      divisionName: {
        $regex: `^${divisionName.trim()}$`,
        $options: "i",
      },
    });

    if (nameExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Division Name already exists.",
        },
        { status: 400 }
      );
    }

    const division = await Division.create({
      companyId,
      divisionCode: divisionCode.trim().toUpperCase(),
      divisionName: divisionName.trim(),
      shortName: shortName?.trim() || "",
      description: description?.trim() || "",
      status: status || "Active",
    });

    return NextResponse.json({
      success: true,
      message: "Division created successfully.",
      data: division,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}