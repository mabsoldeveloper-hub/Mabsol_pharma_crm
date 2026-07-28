import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const customerDoc = await Customer.findById(id).lean();
    if (!customerDoc) {
      return NextResponse.json(null, { status: 404 });
    }

    const scode = String((customerDoc as any).SCODE || "").trim();
    let groupInfo: any = {};
    if (scode) {
      const groupDoc = await AccountGroup.findOne(
        { ORDNO: scode },
        { PARNAM: 1, GROUP: 1, GCODE: 1 }
      ).lean();

      if (groupDoc) {
        groupInfo = {
          GROUPNAME: groupDoc.PARNAM || "",
          MAINGROUP: groupDoc.GROUP || "",
          PARENTGROUP: groupDoc.GCODE || "",
        };
      }
    }

    const enriched = {
      ...customerDoc,
      ...groupInfo,
    };

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch customer" },
      { status: 500 }
    );
  }
}