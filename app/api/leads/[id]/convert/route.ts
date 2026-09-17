import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import Customer from "@/models/Customer";

export const dynamic = "force-dynamic";

// ─── POST: Convert lead to customer ──────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const lead = await Lead.findById(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.isConverted) {
      return NextResponse.json(
        { error: "This lead has already been converted to a customer." },
        { status: 400 }
      );
    }

    let body: any = {};
    try { body = await req.json(); } catch {}

    let customerId = body.customerId || null;

    // If no existing customerId is provided, automatically create new Customer record in Party Master
    if (!customerId) {
      const codeP = `CUST_${Date.now().toString().slice(-6)}`;
      const mongoose = (await import("mongoose")).default;
      const rawCompanyId = user.companyId?._id || user.companyId || lead.companyId;
      const companyId = (rawCompanyId && mongoose.Types.ObjectId.isValid(String(rawCompanyId)))
        ? new mongoose.Types.ObjectId(String(rawCompanyId))
        : rawCompanyId;

      const newCustomer = await Customer.create({
        PARNAM: lead.partyName,
        CODEP: codeP,
        ORDNO: codeP,
        CONTACT: lead.contactPerson || lead.partyName,
        MOBILE: lead.phone || "",
        PHONE: lead.phone || "",
        EMAIL: lead.email || "",
        ADD1: lead.address || "",
        ADDRESS1: lead.address || "",
        CITY: lead.city || "",
        STATE: lead.state || "",
        PIN: lead.pincode || "",
        GSTIN: lead.gstin || "",
        GSTNO: lead.gstin || "",
        SALDR: "Y",
        STATUS: "Y",
        companyId: companyId,
        _vfpTable: "vfp_new_folder_order",
        _vfpSourceKey: `MANUAL_CUST_${codeP}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });

      customerId = newCustomer._id.toString();
    }

    // Mark lead as converted and Won
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      {
        $set: {
          isConverted: true,
          convertedAt: new Date(),
          convertedBy: user._id,
          stage: "Won",
          convertedCustomerId: customerId,
        },
      },
      { new: true }
    );

    // Log conversion activity
    await LeadActivity.create({
      leadId: id,
      userId: user._id,
      userName: user.name,
      type: "System",
      fromStage: lead.stage,
      toStage: "Won",
      summary: `🎉 Lead successfully converted to Customer (${lead.partyName}) by ${user.name}`,
    });

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      customerId,
      message: "Lead converted to customer successfully!",
    });
  } catch (error: any) {
    console.error("[LEAD CONVERT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
