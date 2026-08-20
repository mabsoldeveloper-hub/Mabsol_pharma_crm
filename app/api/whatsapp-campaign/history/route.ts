import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import WhatsAppCampaign from "@/models/WhatsAppCampaign";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 30;

    const campaigns = await WhatsAppCampaign.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalCampaigns = await WhatsAppCampaign.countDocuments({});

    // Aggregation for stats
    const statsResult = await WhatsAppCampaign.aggregate([
      {
        $group: {
          _id: null,
          totalSent: { $sum: "$sentCount" },
          totalFailed: { $sum: "$failedCount" },
          totalRecipients: { $sum: "$totalCount" },
        },
      },
    ]);

    const stats = statsResult[0] || {
      totalSent: 0,
      totalFailed: 0,
      totalRecipients: 0,
    };

    return NextResponse.json({
      success: true,
      campaigns,
      summary: {
        totalCampaigns,
        totalSent: stats.totalSent,
        totalFailed: stats.totalFailed,
        totalRecipients: stats.totalRecipients,
      },
    });
  } catch (err: any) {
    console.error("WHATSAPP CAMPAIGN HISTORY ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch WhatsApp campaign history" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    await WhatsAppCampaign.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "WhatsApp campaign deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
