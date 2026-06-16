import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

export async function GET() {
  try {
    await dbConnect();

    return NextResponse.json({
      success: true,
      message: "Mongoose Connected Successfully",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}