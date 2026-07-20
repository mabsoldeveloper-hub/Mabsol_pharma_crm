/**
 * models/StockModels.ts
 * -----------------------------------------------------------------------
 * Consolidated Mongoose models for the Pharma Stock Dashboard.
 * Field names match the actual VFP DBF -> MongoDB sync exactly
 * (as found in the uploaded PRO / PROBAT / DIS / MDIS / GLEDGER /
 * ORDER / PEND / SUBDIS JSON dumps).
 *
 * NOTES / ASSUMPTIONS (please verify against your real DB):
 * 1. Collection names are assumed to be the lowercase VFP table name
 *    (e.g. "pro", "probat", "dis" ...). Change the `collection` option
 *    below if your Mongo collections are named differently.
 * 2. Date fields (DATE, CDATE, EXP, MFD, DDATE) are stored as plain
 *    "YYYY-MM-DD" strings in the source data, NOT native BSON Date.
 *    They are kept as String here so nothing breaks on insert/read.
 *    String comparison works fine for range queries because the
 *    format is already ISO (YYYY-MM-DD).
 * 3. `strict: false` is used on every schema because these DBF-derived
 *    documents carry 70-120+ legacy fields (MISC1, MISC2, GCODE3 ...).
 *    Only the fields actually used by the dashboard are declared
 *    explicitly; everything else still comes through on read.
 * 4. There is no explicit "Reserved Stock", "Blocked Stock" or
 *    "Damaged Stock" field anywhere in the source tables. The API
 *    route returns 0 / null for these with a comment — wire them up
 *    once you decide where that data will live (e.g. a status flag
 *    on PROBAT, or a new adjustments collection).
 * -----------------------------------------------------------------------
 */

import mongoose, { Schema, model, models } from "mongoose";

/* ------------------------------------------------------------------ */
/* PRO — Product Master                                                */
/* ------------------------------------------------------------------ */
const ProductSchema = new Schema(
    {
        CODE: { type: Number, index: true }, // product code (PK)
        PRODUCT: String, // product name
        BILLNAME: String, // name printed on invoice
        PACKING: String,
        GCODE: { type: String, index: true }, // company / group code
        GCODE3: String,
        UNIT: String,
        UNIT2: String,
        MRP: Number,
        PRATE: Number, // sale rate
        LPRATE: Number, // purchase/landed rate
        MINIMUM: Number, // reorder level
        MAXIMUM: Number,
        OPENING: Number, // opening qty
        OPEVAL: Number, // opening value
        BALANCE: Number, // current stock qty (product level)
        HOLD: Schema.Types.Mixed,
        STATUS: String,
        CGST: Number,
        IGST: Number,
        CESSINRS: Number,
        RACKNO: String,
    },
    { strict: false, collection: "pro" }
);

/* ------------------------------------------------------------------ */
/* PROBAT — Batch Wise Stock                                          */
/* ------------------------------------------------------------------ */
const ProductBatchSchema = new Schema(
    {
        CODE: { type: Number, index: true }, // fk -> PRO.CODE
        BATCHNO: { type: String, index: true },
        PRODUCT: String,
        BILLNAME: String,
        PACKING: String,
        DATE: String, // batch entry date (YYYY-MM-DD)
        EXP: { type: String, index: true }, // expiry date (YYYY-MM-DD)
        MFD: String, // manufacture date
        MRP: Number,
        PRATE: Number,
        LPRATE: Number,
        OPENING: Number,
        QTY: Number,
        BALANCE: { type: Number, index: true }, // current batch qty
        SUPCODE: String, // supplier code
        SUPDAT: String,
        SUPINVO: String,
        HOLD: Schema.Types.Mixed,
        SELECT: String,
    },
    { strict: false, collection: "probat" }
);

/* ------------------------------------------------------------------ */
/* DIS — Stock Out / Sales (invoice line items)                       */
/* ------------------------------------------------------------------ */
const SalesDisSchema = new Schema(
    {
        CODE: { type: Number, index: true }, // fk -> PRO.CODE
        BATCH: String, // fk -> PROBAT.BATCHNO
        DATE: { type: String, index: true },
        CDATE: String,
        QTY: Number,
        ISSUEQTY: Number,
        FREE: Number,
        RATE: Number,
        MRP: Number,
        AMMMOUNT: Number, // line amount (sic, matches VFP spelling)
        SFRATE: Number,
        COMPANY: String,
        VCN: String, // voucher/invoice number
        VOUCHER: Number,
        DSM: String,
        GODWON: String,
        EXP: String,
        FLAG: String,
    },
    { strict: false, collection: "dis" }
);

/* ------------------------------------------------------------------ */
/* MDIS — Invoice Header                                              */
/* ------------------------------------------------------------------ */
const SalesMdisSchema = new Schema(
    {
        VOUCHER: { type: Number, index: true },
        VCN: { type: String, index: true }, // invoice number
        CODEP: { type: String, index: true }, // fk -> ORDER.CODEP customer code
        DATE: { type: String, index: true },
        CDATE: String,
        FINAL: Number, // final invoice amount
        AMOUNTT: Number,
        AMOUNTP: Number,
        AMOUNTE: Number,
        COST: Number,
        ISSUEQTY: Number,
        CHALLAN: String,
        GODWON: String,
        DSM: String,
    },
    { strict: false, collection: "mdis" }
);

/* ------------------------------------------------------------------ */
/* GLEDGER — Stock Value / Financial Ledger                           */
/* ------------------------------------------------------------------ */
const GLedgerSchema = new Schema(
    {
        CODE: String,
        CODE1: String,
        DATE: { type: String, index: true },
        DEBIT: Number,
        CREDIT: Number,
        VOUCHER: Number,
        TYPE: String,
        BOOK: String,
        REMARK1: String,
    },
    { strict: false, collection: "gledger" }
);

/* ------------------------------------------------------------------ */
/* ORDER — Customer Master                                            */
/* ------------------------------------------------------------------ */
const OrderSchema = new Schema(
    {
        CODEP: { type: String, index: true }, // customer code
        CODER: String,
        PARNAM: String, // party/customer name
        MAILNAM: String,
        CITY: String,
        PHONE1: String,
        GSTNO: String,
        BALANCE: Number, // outstanding balance
        CREDIT: Number, // credit limit
        CREDITD: Number, // credit days
        DUEDAYS: Number,
        ORDNO: String,
        DATE: String,
    },
    { strict: false, collection: "order" }
);

/* ------------------------------------------------------------------ */
/* PEND — Pending Vouchers / Adjustments                              */
/* ------------------------------------------------------------------ */
const PendSchema = new Schema(
    {
        VOUCHER: Number,
        SVOUCHER: Number,
        ADJVOUCHER: Number,
        DDATE: { type: String, index: true },
        FINAL: Number,
        ORD: String,
        TYPE: String,
        VCN: String,
    },
    { strict: false, collection: "pend" }
);

/* ------------------------------------------------------------------ */
/* SUBDIS — Dispatch Details                                          */
/* ------------------------------------------------------------------ */
const SubDisSchema = new Schema(
    {
        CODE: Number,
        CODEC: String,
        CODEP: { type: String, index: true }, // fk -> ORDER.CODEP
        VCN: { type: String, index: true },
        VOUCHER: Number,
        DATE: { type: String, index: true },
        GODWON: String,
        DSM: String,
        BOOK: String,
        TYPE: String,
        MR: String,
    },
    { strict: false, collection: "subdis" }
);

/* ------------------------------------------------------------------ */
/* Export models (reuse across hot-reloads in Next.js dev mode)       */
/* ------------------------------------------------------------------ */
export const Product = models.Product || model("Product", ProductSchema);
export const ProductBatch =
    models.ProductBatch || model("ProductBatch", ProductBatchSchema);
export const SalesDis = models.SalesDis || model("SalesDis", SalesDisSchema);
export const SalesMdis =
    models.SalesMdis || model("SalesMdis", SalesMdisSchema);
export const GLedger = models.GLedger || model("GLedger", GLedgerSchema);
export const Order = models.Order || model("Order", OrderSchema);
export const Pend = models.Pend || model("Pend", PendSchema);
export const SubDis = models.SubDis || model("SubDis", SubDisSchema);

export default mongoose;