import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
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
    // 1. Scan Target Master for Active Targets & Gift Schemes (category: TARGETS)
    try {
      const TargetMaster = mongoose.models.TargetMaster || mongoose.model("TargetMaster");
      if (TargetMaster) {
        const activeTargets = await TargetMaster.find({}).limit(20).lean();
        for (const targetDoc of activeTargets) {
          const name = targetDoc.targetType === "MR" ? targetDoc.mrName : targetDoc.customerName;
          const month = targetDoc.periodMonth;
          const salesTarget = targetDoc.targetAmount || 0;

          if (name && salesTarget > 0) {
            const title = `🎯 Target Active: ${name} (${month})`;
            const message = `Sales Target set for ${month}: ₹${salesTarget.toLocaleString("en-IN")}. Track live performance in Target vs Actual report.`;

            const existing = await Notification.findOne({
              type: "TARGET_MILESTONE",
              entityId: String(targetDoc._id),
            });

            if (!existing) {
              await Notification.create({
                title,
                message,
                type: "TARGET_MILESTONE",
                category: "TARGETS",
                severity: "info",
                targetRole: "All",
                entityId: String(targetDoc._id),
                actionUrl: "/dashboard/reports/target-vs-actual",
              });
            }

            if (targetDoc.hasGiftScheme && Array.isArray(targetDoc.giftSlabs) && targetDoc.giftSlabs.length > 0) {
              const slabName = targetDoc.giftSlabs[0]?.giftName || "Gift Reward";
              const giftTitle = `🎁 Gift Reward Scheme: ${name}`;
              const giftMsg = `Achieve Target for ${month} to unlock reward: ${slabName}!`;

              const giftExisting = await Notification.findOne({
                type: "GIFT_UNLOCKED",
                entityId: String(targetDoc._id),
              });

              if (!giftExisting) {
                await Notification.create({
                  title: giftTitle,
                  message: giftMsg,
                  type: "GIFT_UNLOCKED",
                  category: "TARGETS",
                  severity: "success",
                  targetRole: "All",
                  entityId: String(targetDoc._id),
                  actionUrl: "/dashboard/reports/target-vs-actual",
                });
              }
            }
          }
        }
      }
    } catch (targetScanErr) {
      console.error("Target scan notification error:", targetScanErr);
    }

    // 3. Scan for Low Stock Products (Stock <= MinQty)
    const productColNames = ["products", "vfp_new_folder_products", "items"];
    for (const pColName of productColNames) {
      const exists = await db.listCollections({ name: pColName }).hasNext();
      if (exists) {
        const productsCol = db.collection(pColName);
        const lowStockProducts = await productsCol
          .find({ $expr: { $lte: ["$STOCK", "$MINQTY"] } })
          .limit(20)
          .toArray();

        for (const product of lowStockProducts) {
          const title = `📦 Low Stock Alert: ${product.PNAME || product.NAME || "Item"}`;
          const message = `Current stock for ${product.PNAME || product.NAME} is ${product.STOCK || 0}, below minimum level (${product.MINQTY || 5}).`;

          const existing = await Notification.findOne({
            type: "LOW_STOCK",
            entityId: String(product._id),
          });

          if (!existing) {
            await Notification.create({
              title,
              message,
              type: "LOW_STOCK",
              category: "INVENTORY",
              severity: "warning",
              targetRole: "All",
              entityId: String(product._id),
              actionUrl: "/dashboard/inventory",
            });
            result.lowStockAlertsCreated++;
          }
        }
      }
    }

    // 4. Ensure System Status Notification exists
    const notifCount = await Notification.countDocuments();
    if (notifCount === 0) {
      await Notification.create({
        title: "🚀 Pharma CRM Analytics & Target Engine Active",
        message: "Live Target vs Actual performance calculations, WhatsApp integration & MARG sync are active.",
        type: "GENERAL",
        category: "SYSTEM",
        severity: "info",
        targetRole: "All",
        actionUrl: "/dashboard/reports/target-vs-actual",
      });
    }
  } catch (err: any) {
    result.errors.push(`Notification scan error: ${err.message}`);
  }

  return result;
}
