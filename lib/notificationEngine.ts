import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import TargetMaster from "@/models/TargetMaster";
import Product from "@/models/Product";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import DismissedAlert from "@/models/DismissedAlert";
import mongoose from "mongoose";

export interface ScanAlertsResult {
  overdueAlertsCreated: number;
  lowStockAlertsCreated: number;
  nearExpiryAlertsCreated: number;
  errors: string[];
}

/**
 * Notification & Real-Time Alert Engine
 * Scans MARG CRM records and creates targeted notification alerts for MR, RSM, ZSM, & Admin.
 */
export async function runNotificationAlertScan(): Promise<ScanAlertsResult> {
  await dbConnect();
  const db = mongoose.connection.db;

  const result: ScanAlertsResult = {
    overdueAlertsCreated: 0,
    lowStockAlertsCreated: 0,
    nearExpiryAlertsCreated: 0,
    errors: [],
  };

  if (!db) {
    result.errors.push("Database connection not available");
    return result;
  }

  try {
    // 1. Scan Target Master for Active Targets & Gift Schemes (Latest Targets First)
    try {
      const activeTargets = await TargetMaster.find({})
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

      for (const targetDoc of activeTargets) {
        const entityIdStr = String(targetDoc._id);
        const isDismissed = await DismissedAlert.exists({ entityId: entityIdStr });
        if (isDismissed) continue;

        const name = targetDoc.targetType === "MR" ? targetDoc.mrName : targetDoc.customerName;
        const month = targetDoc.periodMonth;
        const salesTarget = targetDoc.targetAmount || 0;
        let targetUserId = typeof targetDoc.mrUserId === "object"
          ? targetDoc.mrUserId?._id?.toString() || ""
          : String(targetDoc.mrUserId || "");
        let targetMrName = (targetDoc.mrName || "").trim();

        // If target is for a customer, resolve assigned MR from MrCustomerAssignment master
        if (targetDoc.customerCode) {
          const directAssignment = await MrCustomerAssignment.findOne({
            customerCode: targetDoc.customerCode,
            status: "Active",
          }).lean();

          if (directAssignment) {
            targetUserId = targetUserId || String(directAssignment.userId || "");
            targetMrName = targetMrName || directAssignment.userName || "";
          }
        }

        if (name && salesTarget > 0) {
          const title = `🎯 Target Active: ${name} (${month})`;
          const message = `Sales Target set for ${month}: ₹${salesTarget.toLocaleString("en-IN")}. Track live performance in Target vs Actual report.`;

          const existing = await Notification.findOne({
            type: "TARGET_MILESTONE",
            entityId: entityIdStr,
          });

          if (!existing) {
            await Notification.create({
              title,
              message,
              userId: targetUserId,
              type: "TARGET_MILESTONE",
              category: "TARGETS",
              severity: "info",
              targetRole: targetDoc.targetType === "MR" ? "MR" : "All",
              entityId: entityIdStr,
              actionUrl: "/dashboard/reports/target-vs-actual",
              metadata: {
                mrUserId: targetUserId,
                mrName: targetMrName,
                customerCode: targetDoc.customerCode,
                customerName: targetDoc.customerName,
                targetType: targetDoc.targetType,
              },
            });
          }

          if (targetDoc.hasGiftScheme && Array.isArray(targetDoc.giftSlabs) && targetDoc.giftSlabs.length > 0) {
            const slabName = targetDoc.giftSlabs[0]?.giftName || "Gift Reward";
            const giftTitle = `🎁 Gift Reward Scheme: ${name}`;
            const giftMsg = `Achieve Target for ${month} to unlock reward: ${slabName}!`;

            const giftExisting = await Notification.findOne({
              type: "GIFT_UNLOCKED",
              entityId: entityIdStr,
            });

            if (!giftExisting) {
              await Notification.create({
                title: giftTitle,
                message: giftMsg,
                userId: targetUserId,
                type: "GIFT_UNLOCKED",
                category: "TARGETS",
                severity: "success",
                targetRole: targetDoc.targetType === "MR" ? "MR" : "All",
                entityId: entityIdStr,
                actionUrl: "/dashboard/reports/target-vs-actual",
                metadata: {
                  mrUserId: targetUserId,
                  mrName: targetMrName,
                  customerCode: targetDoc.customerCode,
                  customerName: targetDoc.customerName,
                  targetType: targetDoc.targetType,
                },
              });
            }
          }
        }
      }
      } catch (targetScanErr) {
      console.error("Target scan notification error:", targetScanErr);
    }

    // 2. Scan for Out of Stock Products (BALANCE <= 0)
    try {
      const outOfStockItems = await Product.find({ BALANCE: { $lte: 0 } })
        .select("CODE PRODUCT GCODE MRP BALANCE")
        .limit(30)
        .lean();

      for (const item of outOfStockItems) {
        const itemEntityId = String(item._id);
        const isDismissed = await DismissedAlert.exists({ entityId: itemEntityId });
        if (isDismissed) continue;

        const pName = (item as any).PRODUCT || (item as any).PNAME || "Medicine Item";
        const title = `❌ Out of Stock Alert: ${pName}`;
        const message = `Product ${pName} (${(item as any).GCODE || "General"}) is completely OUT OF STOCK (Balance: 0)! Please reorder immediately.`;

        const existing = await Notification.findOne({
          type: "LOW_STOCK",
          entityId: itemEntityId,
        });

        if (!existing) {
          await Notification.create({
            title,
            message,
            type: "LOW_STOCK",
            category: "INVENTORY",
            severity: "error",
            targetRole: "All",
            entityId: itemEntityId,
            actionUrl: "/dashboard/inventory/dashboard",
          });
          result.lowStockAlertsCreated++;
        }
      }

      // 3. Scan for Low Stock Products (MINIMUM > 0 && BALANCE <= MINIMUM)
      const lowStockItems = await Product.find({
        $expr: {
          $and: [
            { $gt: ["$MINIMUM", 0] },
            { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] },
          ],
        },
      })
        .select("CODE PRODUCT GCODE BALANCE MINIMUM")
        .limit(30)
        .lean();

      for (const item of lowStockItems) {
        const itemEntityId = String(item._id);
        const isDismissed = await DismissedAlert.exists({ entityId: itemEntityId });
        if (isDismissed) continue;

        const pName = (item as any).PRODUCT || (item as any).PNAME || "Medicine Item";
        const bal = (item as any).BALANCE ?? 0;
        const min = (item as any).MINIMUM ?? 10;
        const title = `📦 Low Stock Alert: ${pName}`;
        const message = `Current stock for ${pName} is ${bal} units, which is below minimum reorder level (${min}).`;

        const existing = await Notification.findOne({
          type: "LOW_STOCK",
          entityId: itemEntityId,
        });

        if (!existing) {
          await Notification.create({
            title,
            message,
            type: "LOW_STOCK",
            category: "INVENTORY",
            severity: "warning",
            targetRole: "All",
            entityId: itemEntityId,
            actionUrl: "/dashboard/inventory/dashboard",
          });
          result.lowStockAlertsCreated++;
        }
      }
    } catch (stockScanErr) {
      console.error("Stock scan notification error:", stockScanErr);
    }
  } catch (err: any) {
    result.errors.push(`Notification scan error: ${err.message}`);
  }

  return result;
}
