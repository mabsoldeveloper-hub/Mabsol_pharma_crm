import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();

    let query: any = {};
    if (user?.tenantId) {
      query.tenantId = user.tenantId;
    } else if (user?.companyId) {
      const userCompId = typeof user.companyId === "object" ? user.companyId._id : user.companyId;
      query._id = userCompId;
    } else {
      query.tenantId = "TENANT001";
    }

    const company = await Company.findOne(query);
    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const data = await req.json();

    let query: any = {};
    if (user?.tenantId) {
      query.tenantId = user.tenantId;
    } else if (user?.companyId) {
      const userCompId = typeof user.companyId === "object" ? user.companyId._id : user.companyId;
      query._id = userCompId;
    } else {
      query.tenantId = "TENANT001";
    }

    const company = await Company.findOneAndUpdate(
      query,
      data,
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}