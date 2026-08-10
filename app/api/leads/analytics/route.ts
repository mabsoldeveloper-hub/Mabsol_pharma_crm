import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import "@/models/User";
import "@/models/AreaMaster";
import "@/models/Company";

export const dynamic = "force-dynamic";

import mongoose from "mongoose";

function toObjId(id: any) {
  if (!id) return null;
  const str = String(id?._id || id).trim();
  return /^[0-9a-fA-F]{24}$/.test(str) ? new mongoose.Types.ObjectId(str) : str;
}

function checkIsAdmin(user: any) {
  if (!user) return true;
  const roleType = String(user.roleType || "").toUpperCase();
  const roleName = String(user.roleId?.roleName || user.role || "").toUpperCase();

  if (roleType === "MR" || roleType === "RSM" || roleType === "ZSM" || roleName === "EMPLOYEE" || roleName === "MR") {
    return false;
  }
  return true;
}

// ─── GET: Pipeline Analytics ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userCompanyId = user.companyId?._id || user.companyId;
    const reqCompanyId = searchParams.get("companyId");
    const reqFyId = searchParams.get("fyId");
    const reqAssignedTo = searchParams.get("assignedTo");

    const isAdmin = checkIsAdmin(user);
    const andConditions: any[] = [];

    if (!isAdmin) {
      andConditions.push({
        $or: [
          { assignedTo: toObjId(user._id) },
          { assignedTo: String(user._id) },
          { assignedToName: user.name },
          {
            $and: [
              {
                $or: [
                  { assignedTo: null },
                  { assignedTo: { $exists: false } },
                ],
              },
              ...(reqCompanyId && reqCompanyId !== "ALL"
                ? [
                    {
                      $or: [
                        { companyId: toObjId(reqCompanyId) },
                        { companyId: String(reqCompanyId) },
                        { companyId: null },
                        { companyId: { $exists: false } },
                      ],
                    },
                  ]
                : []),
            ],
          },
        ],
      });
    } else {
      if (reqCompanyId && reqCompanyId !== "ALL") {
        andConditions.push({
          $or: [
            { companyId: toObjId(reqCompanyId) },
            { companyId: String(reqCompanyId) },
            { companyId: null },
            { companyId: { $exists: false } },
          ],
        });
      }
      if (reqFyId && reqFyId !== "ALL") {
        andConditions.push({
          $or: [
            { fyId: toObjId(reqFyId) },
            { fyId: String(reqFyId) },
            { fyId: null },
            { fyId: { $exists: false } },
          ],
        });
      }
      if (reqAssignedTo && reqAssignedTo !== "All") {
        andConditions.push({
          $or: [
            { assignedTo: toObjId(reqAssignedTo) },
            { assignedTo: String(reqAssignedTo) },
          ],
        });
      }
    }

    const filterMatch = { $and: andConditions };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      stageBreakdown,
      leadTypeBreakdown,
      sourceBreakdown,
      priorityBreakdown,
      totalLeads,
      wonLeads,
      lostLeads,
      convertedLeads,
      overdueFollowUps,
      newThisMonth,
      totalPipelineValue,
      recentActivities,
    ] = await Promise.all([
      Lead.aggregate([
        { $match: filterMatch },
        { $group: { _id: "$stage", count: { $sum: 1 }, totalValue: { $sum: "$estimatedMonthlyValue" } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: filterMatch },
        { $group: { _id: "$leadType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: filterMatch },
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: filterMatch },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      Lead.countDocuments(filterMatch),
      Lead.countDocuments({ ...filterMatch, stage: "Won" }),
      Lead.countDocuments({ ...filterMatch, stage: "Lost" }),
      Lead.countDocuments({ ...filterMatch, isConverted: true }),
      Lead.countDocuments({
        ...filterMatch,
        nextFollowUpDate: { $lt: now },
        stage: { $nin: ["Won", "Lost", "Dropped"] },
      }),
      Lead.countDocuments({ ...filterMatch, createdAt: { $gte: startOfMonth } }),
      Lead.aggregate([
        { $match: { ...filterMatch, stage: { $nin: ["Won", "Lost", "Dropped"] } } },
        { $group: { _id: null, total: { $sum: "$estimatedMonthlyValue" } } },
      ]),
      LeadActivity.find({})
        .populate("leadId", "partyName leadNumber")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";
    const pipelineValue = totalPipelineValue[0]?.total || 0;

    return NextResponse.json({
      summary: {
        totalLeads,
        wonLeads,
        lostLeads,
        convertedLeads,
        overdueFollowUps,
        newThisMonth,
        conversionRate,
        pipelineValue,
      },
      stageBreakdown,
      leadTypeBreakdown,
      sourceBreakdown,
      priorityBreakdown,
      recentActivities,
    });
  } catch (error: any) {
    console.error("[LEADS ANALYTICS]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
