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
    // 1. Scan for Overdue Outstanding Payments (>30 days overdue)
    const pendsCol = db.collection("pends");
    const overdueVouchers = await pendsCol
      .find({ FINAL: { $gt: 0 }, DUEDAYS: { $gte: 30 } })
      .limit(100)
      .toArray();

    for (const voucher of overdueVouchers) {
      const title = `⚠️ Payment Overdue: Party ${voucher.ORD || "Party"}`;
      const message = `Voucher #${voucher.VOUCHER || voucher.VCN || "N/A"} has pending amount of ₹${voucher.FINAL} overdue by ${voucher.DUEDAYS} days!`;

      const existing = await Notification.findOne({
        type: "OUTSTANDING_OVERDUE",
        entityId: String(voucher._id),
      });

      if (!existing) {
        await Notification.create({
          title,
          message,
          type: "OUTSTANDING_OVERDUE",
          severity: voucher.DUEDAYS >= 60 ? "error" : "warning",
          targetRole: "All",
          entityId: String(voucher._id),
          metadata: {
            ord: voucher.ORD,
            voucherNo: voucher.VOUCHER,
            amount: voucher.FINAL,
            dueDays: voucher.DUEDAYS,
            mr: voucher.MR,
          },
        });
        result.overdueAlertsCreated++;
      }
    }

    // 2. Scan for Low Stock Products (Stock <= MinQty)
    const productsCol = db.collection("products");
    const lowStockProducts = await productsCol
      .find({ $expr: { $lte: ["$STOCK", "$MINQTY"] } })
      .limit(50)
      .toArray();

    for (const product of lowStockProducts) {
      const title = `📦 Low Stock Alert: ${product.PNAME || "Item"}`;
      const message = `Current stock for ${product.PNAME} (${product.PACK || "unit"}) is ${product.STOCK || 0}, which is below minimum level (${product.MINQTY || 5}).`;

      const existing = await Notification.findOne({
        type: "LOW_STOCK",
        entityId: String(product._id),
      });

      if (!existing) {
        await Notification.create({
          title,
          message,
          type: "LOW_STOCK",
          severity: "warning",
          targetRole: "All",
          entityId: String(product._id),
          metadata: {
            pcode: product.PCODE,
            pname: product.PNAME,
            stock: product.STOCK,
            minQty: product.MINQTY,
          },
        });
        result.lowStockAlertsCreated++;
      }
    }

    // 3. Scan for Near-Expiry Batches (Expiring within 180 days)
    const disCol = db.collection("vfp_new_folder_salesdis");
    const existsDis = await db.listCollections({ name: "vfp_new_folder_salesdis" }).hasNext();

    if (existsDis) {
      const sixMonthsLater = new Date();
      sixMonthsLater.setDate(sixMonthsLater.getDate() + 180);

      const nearExpiryBatches = await disCol
        .find({ EXP: { $lte: sixMonthsLater, $gte: new Date() } })
        .limit(50)
        .toArray();

      for (const batchDoc of nearExpiryBatches) {
        const title = `⏰ Near Expiry Alert: Batch ${batchDoc.BATCH || "Unknown"}`;
        const expStr = batchDoc.EXP ? new Date(batchDoc.EXP).toLocaleDateString() : "N/A";
        const message = `Item batch ${batchDoc.BATCH} expires on ${expStr}. Ensure stock liquidation before expiry date!`;

        const existing = await Notification.findOne({
          type: "NEAR_EXPIRY",
          entityId: String(batchDoc._id),
        });

        if (!existing) {
          await Notification.create({
            title,
            message,
            type: "NEAR_EXPIRY",
            severity: "error",
            targetRole: "All",
            entityId: String(batchDoc._id),
            metadata: {
              batch: batchDoc.BATCH,
              exp: batchDoc.EXP,
              company: batchDoc.COMPANY,
            },
          });
          result.nearExpiryAlertsCreated++;
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Notification scan error: ${err.message}`);
  }

  return result;
}
