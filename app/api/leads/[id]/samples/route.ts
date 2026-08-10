import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import LeadSampleRequest from "@/models/LeadSampleRequest";

export const dynamic = "force-dynamic";

// ─── GET: Sample requests for a lead ─────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const samples = await LeadSampleRequest.find({ leadId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ samples });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Create sample request for a lead ───────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const sample = await LeadSampleRequest.create({ leadId: id, ...body });

    // Update lead stage to Sample Delivered if needed
    const lead = await Lead.findById(id);
    if (lead && lead.stage === "Contacted") {
      await Lead.findByIdAndUpdate(id, { $set: { stage: "Sample Delivered" } });
    }

    // Log activity
    const itemNames = (body.items || []).map((i: any) => i.productName).join(", ");
    await LeadActivity.create({
      leadId: id,
      userId: body.requestedBy,
      userName: body.requestedByName || "System",
      type: "Sample Delivered",
      summary: `Sample request created for: ${itemNames || "items"}. Courier: ${body.courierName || "TBD"}`,
    });

    return NextResponse.json({ sample }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
