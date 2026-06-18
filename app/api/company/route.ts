import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";

export async function GET() {
  try {
    await connectDB();

    const company = await Company.findOne({
      tenantId: "TENANT001",
    });

    return NextResponse.json(company);

  } catch (error) {

    return NextResponse.json(
      { error: "Failed to load company" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {

  try {

    await connectDB();

    const data = await req.json();

    const company =
      await Company.findOneAndUpdate(
        {
          tenantId: "TENANT001",
        },
        data,
        {
          upsert: true,
          new: true,
        }
      );

    return NextResponse.json(company);

  } catch (error) {

    return NextResponse.json(
      { error: "Failed to save company" },
      { status: 500 }
    );
  }
}