import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MrDcr from "@/models/MrDcr";
import MrCallLog from "@/models/MrCallLog";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// =======================
// GET - Single DCR Record with attached Calls
// =======================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const dcr = await MrDcr.findById(id).populate("userId", "name email employeeCode mobile designation");
    if (!dcr) {
      return NextResponse.json(
        { success: false, message: "DCR record not found." },
        { status: 404 }
      );
    }

    const calls = await MrCallLog.find({ dcrId: id }).sort({ createdAt: 1 });

    return NextResponse.json({
      success: true,
      data: {
        ...dcr.toObject(),
        calls,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch DCR details" },
      { status: 500 }
    );
  }
}

// =======================
// PUT - Manager Approval / DCR Update
// =======================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await getCurrentUser();

    const body = await req.json();
    const { approvalStatus, approvalRemarks } = body;

    const dcr = await MrDcr.findById(id);
    if (!dcr) {
      return NextResponse.json(
        { success: false, message: "DCR record not found." },
        { status: 404 }
      );
    }

    // Manager Approval Update
    if (approvalStatus) {
      dcr.approvalStatus = approvalStatus;
      dcr.approvalRemarks = approvalRemarks || "";
      if (user) {
        dcr.approvedBy = user._id;
        dcr.approvedByName = user.name;
        dcr.approvedAt = new Date();
      }
      await dcr.save();
    }

    return NextResponse.json({
      success: true,
      message: `DCR status updated to ${dcr.approvalStatus}.`,
      data: dcr,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update DCR" },
      { status: 500 }
    );
  }
}
