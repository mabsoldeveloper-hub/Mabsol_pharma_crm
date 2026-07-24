import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Division from "@/models/Division";

// ==========================
// GET : Division List
// ==========================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const companyCode = searchParams.get("companyCode") || "";
    const status = searchParams.get("status") || "";

    const filter: any = {};

    if (companyCode) {
      filter.companyCode = companyCode;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        {
          divisionCode: {
            $regex: search,
            $options: "i",
          },
        },
        {
          divisionName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          companyName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const divisions = await Division.find(filter).sort({
      companyName: 1,
      divisionName: 1,
    });

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
      {
        status: 500,
      }
    );

  }
}

// ==========================
// POST : Create Division
// ==========================
export async function POST(req: NextRequest) {

  try {

    await connectDB();

    const body = await req.json();

    const {
      companyCode,
      companyName,
      divisionCode,
      divisionName,
      shortName,
      description,
      status,
    } = body;

    if (
      !companyCode ||
      !companyName ||
      !divisionCode ||
      !divisionName
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company, Division Code and Division Name are required.",
        },
        {
          status: 400,
        }
      );
    }

    // Duplicate Code

    const codeExists = await Division.findOne({
      companyCode,
      divisionCode: divisionCode.trim().toUpperCase(),
    });

    if (codeExists) {

      return NextResponse.json(
        {
          success: false,
          message: "Division Code already exists.",
        },
        {
          status: 400,
        }
      );

    }

    // Duplicate Name

    const nameExists = await Division.findOne({
      companyCode,
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
        {
          status: 400,
        }
      );

    }

    const division = await Division.create({

      companyCode,

      companyName,

      divisionCode: divisionCode.trim().toUpperCase(),

      divisionName: divisionName.trim(),

      shortName: shortName || "",

      description: description || "",

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
      {
        status: 500,
      }
    );

  }

}