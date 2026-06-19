import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import FinancialYear from "@/models/FinancialYear";

export async function GET() {

  try {

    await connectDB();

    const currentFY =
      await FinancialYear
      .findOne({
        isCurrent: true,
      })
      .populate("companyId");

    return NextResponse.json({
      company:
        currentFY?.companyId || null,
      fy:
        currentFY || null,
    });

  } catch (error) {

    return NextResponse.json(
      {
        error: "Failed",
      },
      {
        status: 500,
      }
    );
  }
}