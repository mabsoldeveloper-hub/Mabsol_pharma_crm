import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CompanyMaster from "@/models/CompanyMaster";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    await connectDB();

    const { id } = await params;

    const company =
      await CompanyMaster.findById(id);

    return NextResponse.json(company);

  } catch (error) {

    return NextResponse.json(
      { error: "Failed" },
      { status: 500 }
    );

  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  try {

    await connectDB();

    const { id } = await params;

    const data = await req.json();

    const company =
      await CompanyMaster.findByIdAndUpdate(
        id,
        data,
        { new: true }
      );

    return NextResponse.json(company);

  } catch (error) {

    return NextResponse.json(
      { error: "Failed" },
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

    await CompanyMaster.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    return NextResponse.json(
      { error: "Failed" },
      { status: 500 }
    );

  }
}