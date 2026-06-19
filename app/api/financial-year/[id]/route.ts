import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

export async function PUT(
  req: Request,
  { params }: any
) {
  try {

    await connectDB();

    const data =
      await req.json();

    await FinancialYear.findByIdAndUpdate(
      params.id,
      data
    );

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    return NextResponse.json(
      {
        error: "Update Failed",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {

    await connectDB();

    await FinancialYear.findByIdAndDelete(
      params.id
    );

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    return NextResponse.json(
      {
        error: "Delete Failed",
      },
      {
        status: 500,
      }
    );
  }
}