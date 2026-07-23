import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const data = await req.json();

    const updated = await FinancialYear.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Financial Year not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "Update Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    console.log("Deleting ID:", id);

    const deleted = await FinancialYear.findByIdAndDelete(id);

    console.log("Deleted:", deleted);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Financial Year not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "Delete Failed" },
      { status: 500 }
    );
  }
}