import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TargetMaster from "@/models/TargetMaster";
import User from "@/models/User";
import Customer from "@/models/Customer";
import SalesMdis from "@/models/SalesMdis";
import GLedger from "@/models/GLedger";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getDaysInMonth(year: number, monthZeroIndexed: number) {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const restriction = await getMrTerritoryRestriction();

    const { searchParams } = new URL(req.url);
    const periodMonth = searchParams.get("periodMonth") || new Date().toISOString().slice(0, 7);
    const targetType = searchParams.get("targetType") || "all"; // "all" | "MR" | "Customer"
    const frequency = searchParams.get("frequency") || "monthly"; // "monthly" | "weekly" | "daily"
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    const [yearStr, monthStr] = periodMonth.split("-");
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const monthIndex = (parseInt(monthStr, 10) || (new Date().getMonth() + 1)) - 1;
    const totalDaysInMonth = getDaysInMonth(year, monthIndex);

    const monthStartDate = `${periodMonth}-01`;
    const monthEndDate = `${periodMonth}-${String(totalDaysInMonth).padStart(2, "0")}`;

    // Target Master filter
    const targetFilter: any = { periodMonth };
    if (targetType && targetType !== "all") {
      targetFilter.targetType = targetType;
    }

    const rawTargets = await TargetMaster.find(targetFilter)
      .populate("mrUserId", "name email employeeCode mobile designation")
      .sort({ createdAt: -1 })
      .lean();

    // Territory restrictions check
    let allowedTargets = rawTargets;
    if (restriction.isMrRestricted && currentUser) {
      const currentUserIdStr = currentUser._id?.toString() || "";
      const currentUserNameStr = (currentUser.name || "").trim().toLowerCase();
      const currentEmpCodeStr = (currentUser.employeeCode || "").trim().toLowerCase();

      const allowedCodesSet = new Set<string>(
        (restriction.allowedOrdnos || []).map((c) => c.trim().toLowerCase())
      );
      const allowedNamesSet = new Set<string>();

      const directAssignments = await MrCustomerAssignment.find(
        { userId: currentUser._id, status: "Active" },
        { customerCode: 1, customerName: 1 }
      ).lean();

      directAssignments.forEach((a: any) => {
        if (a.customerCode) allowedCodesSet.add(String(a.customerCode).trim().toLowerCase());
        if (a.customerName) allowedNamesSet.add(String(a.customerName).trim().toLowerCase());
      });

      const mrCustomerConditions: any[] = [];
      if (currentUserNameStr) {
        mrCustomerConditions.push({ DSM: { $regex: escapeRegex(currentUserNameStr), $options: "i" } });
      }
      if (currentEmpCodeStr) {
        mrCustomerConditions.push({ DSM: { $regex: escapeRegex(currentEmpCodeStr), $options: "i" } });
      }
      if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
        mrCustomerConditions.push({ COMPANY: { $in: restriction.allowedCompanyCodes } });
      }

      if (mrCustomerConditions.length > 0) {
        const matchingCustomers = await Customer.find(
          { $or: mrCustomerConditions },
          { ORDNO: 1, CODEP: 1, PARNAM: 1 }
        ).lean();

        matchingCustomers.forEach((c: any) => {
          if (c.ORDNO) allowedCodesSet.add(String(c.ORDNO).trim().toLowerCase());
          if (c.CODEP) allowedCodesSet.add(String(c.CODEP).trim().toLowerCase());
          if (c.PARNAM) allowedNamesSet.add(String(c.PARNAM).trim().toLowerCase());
        });
      }

      allowedTargets = rawTargets.filter((item: any) => {
        const itemMrId = typeof item.mrUserId === "string" ? item.mrUserId : item.mrUserId?._id?.toString() || "";
        const itemMrNameStr = (item.mrName || "").trim().toLowerCase();
        const hasExplicitMr = Boolean(itemMrId || itemMrNameStr);

        if (hasExplicitMr) {
          return (
            (itemMrId && itemMrId === currentUserIdStr) ||
            (currentUserNameStr && itemMrNameStr.includes(currentUserNameStr)) ||
            (currentEmpCodeStr && itemMrNameStr.includes(currentEmpCodeStr))
          );
        }

        if (item.targetType === "MR") return false;

        if (item.targetType === "Customer") {
          const cCode = (item.customerCode || "").trim().toLowerCase();
          const cName = (item.customerName || "").trim().toLowerCase();
          if (cCode && allowedCodesSet.has(cCode)) return true;
          if (cName && allowedNamesSet.has(cName)) return true;
        }

        return false;
      });
    }

    // Apply search filter
    if (search) {
      allowedTargets = allowedTargets.filter((item: any) => {
        const name = (item.customerName || item.mrName || "").toLowerCase();
        const code = (item.customerCode || "").toLowerCase();
        return name.includes(search) || code.includes(search);
      });
    }

    // Define 5 Calendar Weeks for the month
    const weeks = [
      { weekNo: 1, label: "Week 1 (1 - 7)", startDay: 1, endDay: 7 },
      { weekNo: 2, label: "Week 2 (8 - 14)", startDay: 8, endDay: 14 },
      { weekNo: 3, label: "Week 3 (15 - 21)", startDay: 15, endDay: 21 },
      { weekNo: 4, label: "Week 4 (22 - 28)", startDay: 22, endDay: 28 },
      {
        weekNo: 5,
        label: `Week 5 (29 - ${totalDaysInMonth})`,
        startDay: 29,
        endDay: totalDaysInMonth,
      },
    ].filter((w) => w.startDay <= totalDaysInMonth);

    // Build processing function per target item
    const processedRows = await Promise.all(
      allowedTargets.map(async (item: any) => {
        const salesTarget = item.targetAmount || 0;
        const collectionTarget = item.collectionTargetAmount || 0;

        // Build Sales filter for this entity
        const salesMatch: any = {
          DATE: { $gte: monthStartDate, $lte: monthEndDate },
        };
        const gLedgerMatch: any = {
          BOOK: "R",
          CD: "C",
          DATE: { $gte: monthStartDate, $lte: monthEndDate },
        };

        if (item.targetType === "Customer") {
          if (item.customerCode) {
            salesMatch.$or = [
              { CODEP: item.customerCode },
              { CODE: item.customerCode },
              { PARTY: { $regex: escapeRegex(item.customerName || item.customerCode), $options: "i" } },
            ];
            gLedgerMatch.CODE = item.customerCode;
          } else if (item.customerName) {
            salesMatch.PARTY = { $regex: escapeRegex(item.customerName), $options: "i" };
            const cust = await Customer.findOne(
              { PARNAM: { $regex: escapeRegex(item.customerName), $options: "i" } },
              { ORDNO: 1, CODEP: 1 }
            ).lean();
            if (cust) {
              gLedgerMatch.CODE = cust.ORDNO || cust.CODEP;
            }
          }
        } else if (item.targetType === "MR") {
          const empCode = item.mrUserId?.employeeCode || item.mrUserId?.name || item.mrName;
          if (empCode) {
            salesMatch.$or = [
              { DSM: { $regex: escapeRegex(empCode), $options: "i" } },
              { ASM: { $regex: escapeRegex(empCode), $options: "i" } },
              { RSM: { $regex: escapeRegex(empCode), $options: "i" } },
            ];

            const assignedCusts = await Customer.find(
              { DSM: { $regex: escapeRegex(empCode), $options: "i" } },
              { ORDNO: 1, CODEP: 1 }
            ).lean();

            const assignedCodes = assignedCusts.map((c: any) => c.ORDNO || c.CODEP).filter(Boolean);
            if (assignedCodes.length > 0) {
              gLedgerMatch.CODE = { $in: assignedCodes };
            }
          }
        }

        // Aggregate Sales per day & per month
        const dailySalesAgg = await SalesMdis.aggregate([
          { $match: salesMatch },
          {
            $group: {
              _id: "$DATE",
              totalSales: {
                $sum: {
                  $ifNull: [
                    "$NETAMT",
                    { $ifNull: ["$TOTAMT", { $ifNull: ["$FINAL", { $ifNull: ["$AMOUNT", 0] }] }] },
                  ],
                },
              },
            },
          },
        ]);

        const dailySalesMap: Record<string, number> = {};
        let monthlyActualSales = 0;
        dailySalesAgg.forEach((r: any) => {
          const dateStr = r._id;
          const amt = Math.max(0, Number(r.totalSales) || 0);
          if (dateStr) dailySalesMap[dateStr] = amt;
          monthlyActualSales += amt;
        });

        // Aggregate Collections per day & per month
        const dailyCollectionAgg = await GLedger.aggregate([
          { $match: gLedgerMatch },
          {
            $group: {
              _id: "$DATE",
              totalCollection: {
                $sum: {
                  $ifNull: [
                    "$CREDIT",
                    { $ifNull: ["$AMOUNT", { $ifNull: ["$DEBIT", 0] }] },
                  ],
                },
              },
            },
          },
        ]);

        const dailyCollectionMap: Record<string, number> = {};
        let monthlyActualCollection = 0;
        dailyCollectionAgg.forEach((r: any) => {
          const dateStr = r._id;
          const amt = Math.max(0, Number(r.totalCollection) || 0);
          if (dateStr) dailyCollectionMap[dateStr] = amt;
          monthlyActualCollection += amt;
        });

        // Compute Weekly Breakdown
        const weeklyBreakdown = weeks.map((w) => {
          const daysInWeek = w.endDay - w.startDay + 1;
          const weeklySalesTarget = Math.round((salesTarget * daysInWeek) / totalDaysInMonth);
          const weeklyCollectionTarget = Math.round((collectionTarget * daysInWeek) / totalDaysInMonth);

          let weekActualSales = 0;
          let weekActualCollection = 0;

          for (let d = w.startDay; d <= w.endDay; d++) {
            const dayStr = `${periodMonth}-${String(d).padStart(2, "0")}`;
            weekActualSales += dailySalesMap[dayStr] || 0;
            weekActualCollection += dailyCollectionMap[dayStr] || 0;
          }

          const salesAchPercent =
            weeklySalesTarget > 0 ? Math.min(100, Math.round((weekActualSales / weeklySalesTarget) * 100)) : 0;
          const collectionAchPercent =
            weeklyCollectionTarget > 0
              ? Math.min(100, Math.round((weekActualCollection / weeklyCollectionTarget) * 100))
              : 0;

          return {
            weekNo: w.weekNo,
            label: w.label,
            startDate: `${periodMonth}-${String(w.startDay).padStart(2, "0")}`,
            endDate: `${periodMonth}-${String(w.endDay).padStart(2, "0")}`,
            daysInWeek,
            weeklySalesTarget,
            weekActualSales,
            weeklySalesShortfall: Math.max(0, weeklySalesTarget - weekActualSales),
            salesAchPercent,
            weeklyCollectionTarget,
            weekActualCollection,
            weeklyCollectionShortfall: Math.max(0, weeklyCollectionTarget - weekActualCollection),
            collectionAchPercent,
          };
        });

        // Compute Day-Wise Breakdown
        const dailyBreakdown = [];
        for (let d = 1; d <= totalDaysInMonth; d++) {
          const dayStr = `${periodMonth}-${String(d).padStart(2, "0")}`;
          const dailySalesTarget = Math.round(salesTarget / totalDaysInMonth);
          const dailyCollectionTarget = Math.round(collectionTarget / totalDaysInMonth);
          const dayActualSales = dailySalesMap[dayStr] || 0;
          const dayActualCollection = dailyCollectionMap[dayStr] || 0;

          dailyBreakdown.push({
            date: dayStr,
            day: d,
            dailySalesTarget,
            dayActualSales,
            salesAchPercent:
              dailySalesTarget > 0 ? Math.min(100, Math.round((dayActualSales / dailySalesTarget) * 100)) : 0,
            dailyCollectionTarget,
            dayActualCollection,
            collectionAchPercent:
              dailyCollectionTarget > 0
                ? Math.min(100, Math.round((dayActualCollection / dailyCollectionTarget) * 100))
                : 0,
          });
        }

        // Overall Monthly Stats
        const salesAchPercent =
          salesTarget > 0 ? Math.min(100, Math.round((monthlyActualSales / salesTarget) * 100)) : 0;
        const collectionAchPercent =
          collectionTarget > 0
            ? Math.min(100, Math.round((monthlyActualCollection / collectionTarget) * 100))
            : 0;

        // Unlock gift slab calculation
        let activeGiftSlab = null;
        if (item.hasGiftScheme && Array.isArray(item.giftSlabs) && item.giftSlabs.length > 0) {
          const sorted = [...item.giftSlabs].sort((a, b) => b.minAchievementPercent - a.minAchievementPercent);
          for (const slab of sorted) {
            if (salesAchPercent >= slab.minAchievementPercent) {
              activeGiftSlab = slab;
              break;
            }
          }
        }

        // Lookup phone number for direct WhatsApp messaging: MR target -> MR phone, Customer target -> Customer phone
        let phoneNumber = "";
        try {
          if (item.targetType === "MR") {
            // MR Target: Get MR Executive's phone number
            if (item.mrUserId && typeof item.mrUserId === "object") {
              phoneNumber = item.mrUserId.mobile || item.mrUserId.phone || "";
            }
            if (!phoneNumber && item.mrName) {
              const userDoc = await User.findOne(
                { $or: [{ name: { $regex: escapeRegex(item.mrName), $options: "i" } }, { employeeCode: { $regex: escapeRegex(item.mrName), $options: "i" } }] },
                { mobile: 1, phone: 1 }
              ).lean();
              if (userDoc) phoneNumber = (userDoc as any).mobile || (userDoc as any).phone || "";
            }
          } else if (item.targetType === "Customer") {
            // Customer Target: Get Customer/Party's phone number
            const code = (item.customerCode || "").trim();
            const name = (item.customerName || "").trim();
            if (code || name) {
              const custMatch = code
                ? { $or: [{ ORDNO: code }, { CODEP: code }, { CODE: code }, { SCODE: code }] }
                : { $or: [{ PARNAM: { $regex: escapeRegex(name), $options: "i" } }, { MAILNAM: { $regex: escapeRegex(name), $options: "i" } }] };
              const custDoc = await Customer.findOne(
                custMatch,
                { PHONE1: 1, PHONE2: 1, MOBILE: 1, TEL: 1, REF: 1 }
              ).lean();
              if (custDoc) {
                phoneNumber = (custDoc as any).PHONE1 || (custDoc as any).MOBILE || (custDoc as any).PHONE2 || (custDoc as any).TEL || (custDoc as any).REF || "";
              }
            }
          }
        } catch (phoneErr) {
          console.error("Report phone lookup error:", phoneErr);
        }

        return {
          _id: item._id,
          targetType: item.targetType,
          periodMonth: item.periodMonth,
          mrUserId: item.mrUserId,
          mrName: item.mrName || item.mrUserId?.name || "N/A",
          customerCode: item.customerCode || "N/A",
          customerName: item.customerName || "N/A",
          phoneNumber,
          notes: item.notes || "",
          status: item.status || "Active",
          // Sales Metrics
          salesTarget,
          monthlyActualSales,
          salesShortfall: Math.max(0, salesTarget - monthlyActualSales),
          salesAchPercent,
          // Collection Metrics
          collectionTarget,
          monthlyActualCollection,
          collectionShortfall: Math.max(0, collectionTarget - monthlyActualCollection),
          collectionAchPercent,
          // Gift Scheme
          hasGiftScheme: Boolean(item.hasGiftScheme),
          giftSlabs: item.giftSlabs || [],
          activeGiftSlab,
          // Breakdowns
          weeklyBreakdown,
          dailyBreakdown,
        };
      })
    );

    // Calculate Summary Totals
    let totalSalesTarget = 0;
    let totalActualSales = 0;
    let totalCollectionTarget = 0;
    let totalActualCollection = 0;

    processedRows.forEach((r) => {
      totalSalesTarget += r.salesTarget;
      totalActualSales += r.monthlyActualSales;
      totalCollectionTarget += r.collectionTarget;
      totalActualCollection += r.monthlyActualCollection;
    });

    const overallSalesAchPercent =
      totalSalesTarget > 0 ? Math.min(100, Math.round((totalActualSales / totalSalesTarget) * 100)) : 0;
    const overallCollectionAchPercent =
      totalCollectionTarget > 0
        ? Math.min(100, Math.round((totalActualCollection / totalCollectionTarget) * 100))
        : 0;

    return NextResponse.json({
      success: true,
      periodMonth,
      targetType,
      frequency,
      totalDaysInMonth,
      isMrRestricted: restriction.isMrRestricted,
      summary: {
        totalRecords: processedRows.length,
        totalSalesTarget,
        totalActualSales,
        totalSalesShortfall: Math.max(0, totalSalesTarget - totalActualSales),
        overallSalesAchPercent,
        totalCollectionTarget,
        totalActualCollection,
        totalCollectionShortfall: Math.max(0, totalCollectionTarget - totalActualCollection),
        overallCollectionAchPercent,
      },
      data: processedRows,
    });
  } catch (error: any) {
    console.error("Target vs Actual Report API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate Target vs Actual Report" },
      { status: 500 }
    );
  }
}
