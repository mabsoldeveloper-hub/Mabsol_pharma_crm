import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Division from "@/models/Division";
import Company from "@/models/Company";

// ==============================
// GET Division By ID
// ==============================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const division = await Division.findById(id).populate(
      "companyId",
      "companyName companyCode"
    );

    if (!division) {
      return NextResponse.json(
        {
          success: false,
          message: "Division not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
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

// ==============================
// UPDATE Division
// ==============================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const body = await req.json();

    const {
      companyId,
      divisionCode,
      divisionName,
      shortName,
      description,
      status,
    } = body;

    if (!companyId || !divisionCode || !divisionName) {
      return NextResponse.json(
        {
          success: false,
          message: "Company, Division Code and Division Name are required.",
        },
        { status: 400 }
      );
    }

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
      _id: { $ne: id },
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
      _id: { $ne: id },
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

    const division = await Division.findByIdAndUpdate(
      id,
      {
        companyId,
        divisionCode: divisionCode.trim().toUpperCase(),
        divisionName: divisionName.trim(),
        shortName: shortName?.trim() || "",
        description: description?.trim() || "",
        status: status || "Active",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Division updated successfully.",
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

// ==============================
// DELETE Division
// ==============================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const division = await Division.findById(id);

    if (!division) {
      return NextResponse.json(
        {
          success: false,
          message: "Division not found.",
        },
        { status: 404 }
      );
    }

    await Division.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Division deleted successfully.",
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