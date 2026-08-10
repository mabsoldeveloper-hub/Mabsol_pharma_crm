import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import LeadActivity from "@/models/LeadActivity";
import "@/models/User";

export const dynamic = "force-dynamic";

// ─── GET: Fetch activities for a lead ────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const activities = await LeadActivity.find({ leadId: id })
      .populate("userId", "name profilePhoto")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ activities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Add a new activity to a lead ──────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();

    const activity = await LeadActivity.create({
      leadId: id,
      userId: user._id,
      userName: user.name,
      ...body,
    });

    // Update lastContactedAt on the lead
    const Lead = (await import("@/models/Lead")).default;
    await Lead.findByIdAndUpdate(id, {
      $set: {
        lastContactedAt: new Date(),
        ...(body.nextActionDate ? { nextFollowUpDate: body.nextActionDate } : {}),
        ...(body.nextActionNote ? { nextFollowUpNote: body.nextActionNote } : {}),
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
