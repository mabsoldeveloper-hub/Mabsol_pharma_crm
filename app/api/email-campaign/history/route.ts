import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 20;

    const campaigns = await EmailCampaign.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalCampaigns = await EmailCampaign.countDocuments({});
    
    // Aggregation for stats
    const statsResult = await EmailCampaign.aggregate([
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
    console.error("CAMPAIGN HISTORY API ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch campaign history" },
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

    await EmailCampaign.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
