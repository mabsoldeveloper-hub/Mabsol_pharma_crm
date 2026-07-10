import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SaleType from "@/models/SaleType";

export async function GET() {
  try {
    await connectDB();

    const data = await SaleType.find({});

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
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