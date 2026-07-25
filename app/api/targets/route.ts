import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TargetMaster from "@/models/TargetMaster";
import User from "@/models/User";
import SalesMdis from "@/models/SalesMdis";

export const dynamic = "force-dynamic";

// =======================
// GET - List Targets with Live Sales Achievement Calculation
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType") || "";
    const periodMonth = searchParams.get("periodMonth") || "";
    const mrUserId = searchParams.get("mrUserId") || "";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const filter: any = {};

    if (targetType) filter.targetType = targetType;
    if (periodMonth) filter.periodMonth = periodMonth;
    if (mrUserId) filter.mrUserId = mrUserId;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { mrName: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerCode: { $regex: search, $options: "i" } },
        { periodMonth: { $regex: search, $options: "i" } },
      ];
    }

    const records = await TargetMaster.find(filter)
      .populate("mrUserId", "name email employeeCode mobile designation")
      .sort({ periodMonth: -1, createdAt: -1 });

    // Calculate dynamic live sales achievement for each target record
    const processedRecords = await Promise.all(
      records.map(async (doc) => {
        const item = doc.toObject();
        let achievedAmount = 0;

        try {
          const monthStr = item.periodMonth; // e.g. "2026-07"
          if (monthStr && monthStr.length === 7) {
            const startDate = new Date(`${monthStr}-01T00:00:00.000Z`);
            const endYear = Number(monthStr.split("-")[0]);
            const endMonth = Number(monthStr.split("-")[1]);
            const endDate = new Date(Date.UTC(endYear, endMonth, 0, 23, 59, 59));

            const mdisFilter: any = {};

            // If Customer target
            if (item.targetType === "Customer" && item.customerCode) {
              mdisFilter.$or = [
                { CODE: item.customerCode },
                { PARTY: { $regex: item.customerName || item.customerCode, $options: "i" } },
              ];
            } else if (item.targetType === "MR" && item.mrUserId) {
              // MR target
              const empCode = item.mrUserId?.employeeCode || item.mrName;
              if (empCode) {
                mdisFilter.$or = [
                  { DSM: { $regex: empCode, $options: "i" } },
                  { ASM: { $regex: empCode, $options: "i" } },
                  { RSM: { $regex: empCode, $options: "i" } },
                ];
              }
            }

            // Perform sales aggregation if filter applies
            if (Object.keys(mdisFilter).length > 0) {
              const salesSum = await SalesMdis.aggregate([
                { $match: mdisFilter },
                {
                  $group: {
                    _id: null,
                    totalSales: {
                      $sum: {
                        $ifNull: [
                          "$NETAMT",
                          { $ifNull: ["$TOTAMT", { $ifNull: ["$AMOUNT", 0] }] },
                        ],
                      },
                    },
                  },
                },
              ]);

              if (salesSum && salesSum.length > 0) {
                achievedAmount = Math.max(0, Number(salesSum[0].totalSales) || 0);
              }
            }
          }
        } catch (e) {
          console.error("Sales aggregation error for target:", item._id, e);
        }

        const targetAmount = item.targetAmount || 0;
        const shortfall = Math.max(0, targetAmount - achievedAmount);
        const achievementPercent = targetAmount > 0
          ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100))
          : 0;

        // Determine unlocked gift slab
        let activeGiftSlab = null;
        if (item.hasGiftScheme && Array.isArray(item.giftSlabs) && item.giftSlabs.length > 0) {
          const sortedSlabs = [...item.giftSlabs].sort(
            (a, b) => b.minAchievementPercent - a.minAchievementPercent
          );
          for (const slab of sortedSlabs) {
            if (achievementPercent >= slab.minAchievementPercent) {
              activeGiftSlab = slab;
              break;
            }
          }
        }

        return {
          ...item,
          achievedAmount,
          shortfall,
          achievementPercent,
          activeGiftSlab,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: processedRecords.length,
      data: processedRecords,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch targets" },
      { status: 500 }
    );
  }
}

// =======================
// POST - Create New Target
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      targetType,
      periodMonth,
      mrUserId,
      mrName,
      customerId,
      customerName,
      customerCode,
      targetAmount,
      hasGiftScheme,
      giftSlabs,
      notes,
      status,
    } = body;

    if (!targetType || !periodMonth || !targetAmount) {
      return NextResponse.json(
        { success: false, message: "Target Type, Period Month, and Target Amount are required." },
        { status: 400 }
      );
    }

    let resolvedMrName = mrName || "";
    if (mrUserId) {
      const user = await User.findById(mrUserId);
      if (user) {
        resolvedMrName = user.name;
      }
    }

    const newTarget = await TargetMaster.create({
      targetType,
      periodMonth: periodMonth.trim(),
      mrUserId: mrUserId || null,
      mrName: resolvedMrName,
      customerId: (customerId || "").trim(),
      customerName: (customerName || "").trim(),
      customerCode: (customerCode || "").trim(),
      targetAmount: Number(targetAmount) || 0,
      hasGiftScheme: Boolean(hasGiftScheme),
      giftSlabs: Array.isArray(giftSlabs) ? giftSlabs : [],
      notes: (notes || "").trim(),
      status: status || "Active",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Target created successfully.",
        data: newTarget,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create target record" },
      { status: 500 }
    );
  }
}
