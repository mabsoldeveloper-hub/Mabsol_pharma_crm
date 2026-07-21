/**
 * dashboardModels.ts
 * ---------------------------------------------------------------------------
 * Combined Mongoose model file for the 6 core VFP-synced collections used by
 * the Comparison Dashboard. All models use `strict: false` since the source
 * data comes from a VFP DBF sync and fields can vary slightly row to row.
 *
 * NOTE: `Order` is included here for completeness / future use (it currently
 * looks like a ledger / chart-of-accounts table, not a customer master — it
 * is NOT used by the /api/dashboard/compare route right now).
 * ---------------------------------------------------------------------------
 */

import mongoose, { Schema } from "mongoose";

const opts = { strict: false as const };

// vfp_new_folder_dis  -> line-item sales/dispatch data (product, qty, amount, company)
const SalesDisSchema = new Schema({}, { ...opts, collection: "vfp_new_folder_dis" });

// vfp_new_folder_mdis -> master invoice/voucher header (TYPE: S=Sale, P=Purchase, V=Voucher, B=Bonus, L=Ledger)
const SalesMdisSchema = new Schema({}, { ...opts, collection: "vfp_new_folder_mdis" });

// vfp_new_folder_pro  -> product master (CODE, PRODUCT, GCODE, MRP, etc.)
const ProductSchema = new Schema({}, { ...opts, collection: "vfp_new_folder_pro" });

// vfp_new_folder_order -> ledger / chart-of-accounts (NOT a customer master — kept for future use)
const OrderSchema = new Schema({}, { ...opts, collection: "vfp_new_folder_order" });

// vfp_new_folder_gledger -> general ledger entries (DEBIT/CREDIT = collections & payments)
const GLedgerSchema = new Schema({}, { ...opts, collection: "vfp_new_folder_gledger" });

// vfp_new_folder_pendings -> outstanding/pending invoices (BALANCE, DUEDAYS, FINAL)
const PendingsSchema = new Schema({}, { ...opts, collection: "vfp_new_folder_pendings" });

export const SalesDis =
    mongoose.models.SalesDis || mongoose.model("SalesDis", SalesDisSchema);

export const SalesMdis =
    mongoose.models.SalesMdis || mongoose.model("SalesMdis", SalesMdisSchema);

export const Product =
    mongoose.models.Product || mongoose.model("Product", ProductSchema);

export const Order =
    mongoose.models.Order || mongoose.model("Order", OrderSchema);

export const GLedger =
    mongoose.models.GLedger || mongoose.model("GLedger", GLedgerSchema);

export const Pendings =
    mongoose.models.pendings || mongoose.model("pendings", PendingsSchema);

export default {
    SalesDis,
    SalesMdis,
    Product,
    Order,
    GLedger,
    Pendings,
};