import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import LeadQuotation from "@/models/LeadQuotation";
import LeadActivity from "@/models/LeadActivity";

export const dynamic = "force-dynamic";

// ─── GET: Quotations for a lead ───────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const quotations = await LeadQuotation.find({ leadId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ quotations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Create quotation for a lead ───────────────────────────────────────
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

    // Auto-generate quotation number
    const count = await LeadQuotation.countDocuments();
    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${String(count + 1).padStart(4, "0")}`;

    const quotation = await LeadQuotation.create({
      leadId: id,
      quotationNumber,
      createdBy: user._id,
      createdByName: user.name,
      ...body,
    });

    // Log activity
    await LeadActivity.create({
      leadId: id,
      userId: user._id,
      userName: user.name,
      type: "Quotation Sent",
      summary: `Quotation ${quotationNumber} created (Total: ₹${body.grandTotal?.toLocaleString("en-IN") || 0})`,
    });

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
