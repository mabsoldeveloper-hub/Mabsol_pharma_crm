import mongoose, { Schema, Model } from "mongoose";

/**
 * models/IndiaMapModels.ts
 * -----------------------------------------------------------------------------
 * ALL 8 of your real VFP tables in one file: MDIS, DIS, SUBDIS, PEND, GLEDGER,
 * PRO, PROBAT, ORDER.
 *
 * This replaces the previous version, which only modelled 6 tables and left
 * PROBAT (batch/expiry stock) and ORDER (party ledger master) completely
 * unused. Field lists below were checked against your actual uploaded
 * exports (mabsol_pharma_crm_vfp_new_folder_*.json), not guessed — every
 * field named here really appears in your data with the type shown.
 *
 * IMPORTANT — read before wiring ORDER into anything party-specific:
 *   ORDER is a Tally-style ledger/party master (PARNAM, CITY, GSTNO, address,
 *   balances, SALCR/PURCR/RECCR/PAYCR flags). It does NOT use the same
 *   2-letter party code ("IQ", "HW", "LN" …) that MDIS.CODEP / DIS.CODEP /
 *   SUBDIS.CODEP / PEND.ORD / GLEDGER.CODE all share with each other.
 *   Verified directly against your data:
 *     - union of party codes across MDIS/DIS/SUBDIS/PEND = 131 codes
 *     - GLEDGER.CODE covers 127 of those 131 (97%)              ✅ same code space
 *     - ORDER.CODEP / ORDER.SCODE / ORDER.CODER cover 0 of those 131 ❌
 *   So ORDER cannot be reconciled with the Sales/Outstanding/Dispatch numbers
 *   below without a mapping table that doesn't exist in your 8 files. It IS
 *   used here as its own independent "Party Directory & Ledger Balances"
 *   panel (real names, cities, GST numbers, balances) — just not blended
 *   into the per-state Sales/Outstanding figures. If you have (or your VFP
 *   system has) a table that maps ORDER's ledger to the 2-letter CODEP, send
 *   it and this can be merged into one true customer-360 view.
 *
 * strict:false everywhere so any extra VFP field not listed here still
 * passes through untouched.
 * -----------------------------------------------------------------------------
 */

// ---- MDIS: sales + purchase voucher HEADER (both live in the same table) ----
// TYPE decodes which kind of voucher a row is — verified against VCN prefix:
//   TYPE 'S' = Sales invoice        (VCN starts "Y…", e.g. YH21-22/0006)  258 rows
//   TYPE 'P' = Purchase invoice     (VCN starts "P…", e.g. P000007)       139 rows
//   TYPE 'B' = Debit/Credit note    (VCN starts "D…", e.g. DN00001)         4 rows
//   TYPE 'V' = Provisional / challan-only voucher, no VCN yet (CHALLAN     334 rows
//              references an OS-series challan) — not a confirmed invoice,
//              kept out of Sales/Purchase totals and reported separately.
//   TYPE 'L' / lowercase 'u' = 1 row each, data anomalies, ignored.
const SalesMdisSchema = new Schema(
    {
        VOUCHER: Number,
        CODEP: String, // party / supplier code, shared with DIS/SUBDIS/PEND/GLEDGER
        TYPE: String, // S / P / B / V / L
        VCN: String,
        TRANSFER: String,
        CHALLAN: String,
        FINAL: Number, // total invoice value (incl. tax) — what we roll up as Sales/Purchase
        AMOUNTT: Number,
        TAXAMO: Number,
        DATE: String,
        CDATE: String,
        MISC1: String, // "06-HARYANA" style — GST state-code prefix, always populated
        GODWON: String,
        DELEVERY: String,
        TRANSPORT: String,
        REMARK1: String,
    },
    { strict: false, collection: "mdis" }
);

// ---- DIS: item / qty / tax detail lines under a voucher ----
const SalesDisSchema = new Schema(
    {
        VOUCHER: Number,
        CODEP: String,
        CODE: Number, // product code -> PRO.CODE
        QTY: Number,
        ISSUEQTY: Number,
        RATE: Number,
        MRP: Number,
        AMMMOUNT: Number, // line value
        DATE: String,
        BATCH: String,
    },
    { strict: false, collection: "dis" }
);

// ---- SUBDIS: dispatch / transport register per voucher ----
const SubDisSchema = new Schema(
    {
        VOUCHER: Number,
        CODEP: String,
        DATE: String,
        BOOK: String,
        VCN: String,
        TYPE: String,
        RTQT: String, // free-text route/qty string, e.g. "SFF   CT  12.00;2;1200;…"
    },
    { strict: false, collection: "subdis" }
);

// ---- PEND: outstanding / pending-receivable ledger ----
const PendSchema = new Schema(
    {
        VOUCHER: Number,
        SVOUCHER: Number,
        ADJVOUCHER: Number,
        ORD: String, // party code (same space as CODEP) — 61% direct coverage, see route.ts
        FINAL: Number, // signed pending amount
        DDATE: String,
        TYPE: String,
        VCN: String,
    },
    { strict: false, collection: "pend" }
);

// ---- GLEDGER: general ledger — receipts, payments, journals ----
// BOOK decodes the transaction type (verified: CREDIT total == DEBIT total per
// book across the whole file, as expected for a double-entry ledger):
//   'R' = Receipt  (money IN from a party)  -> sum CREDIT on the party's row
//   'P' = Payment  (money OUT to a party)   -> sum DEBIT on the party's row
//   'S' = Sales journal, 'A' = Purchase/adjustment journal, 'J' = Journal,
//   'D' = Debit note journal — these mirror MDIS and are not re-summed here
//   to avoid double counting.
const GLedgerSchema = new Schema(
    {
        VOUCHER: Number,
        CODE: String, // party code — 97% overlap with the MDIS/DIS/SUBDIS/PEND code space
        GCODE: String, // ledger group code (matches ORDER.SCODE, e.g. "J11") — head-office side of the entry, not the party
        BOOK: String, // R / P / S / A / J / D
        CD: String, // 'C' or 'D' — which side of the entry this row is
        CREDIT: Number,
        DEBIT: Number,
        DATE: String,
        REMARK1: String,
        REMARK2: String,
    },
    { strict: false, collection: "gledger" }
);

// ---- PRO: product master (current overall stock position) ----
const ProductSchema = new Schema(
    {
        CODE: Number,
        BILLNAME: String,
        PRODUCT: String,
        GCODE: String, // product category/division, e.g. "FB", "FC"
        UNIT: String,
        MRP: Number,
        LPRATE: Number,
        BALANCE: Number, // current stock qty on hand
        MINIMUM: Number, // reorder threshold — BALANCE <= MINIMUM flags low stock
        MAXIMUM: Number,
    },
    { strict: false, collection: "pro" }
);

// ---- PROBAT: batch-wise stock with expiry, for expiry-alert reporting ----
const ProBatSchema = new Schema(
    {
        CODE: Number, // -> PRO.CODE
        BATCHNO: String,
        BILLNAME: String,
        MFD: String,
        EXP: String, // expiry date — batches expiring soon / already expired
        BALANCE: Number, // batch stock qty on hand
        MRP: Number,
        LPRATE: Number,
        DATE: String,
    },
    { strict: false, collection: "probat" }
);

// ---- ORDER: party / ledger master (see the join-gap note above) ----
const OrderSchema = new Schema(
    {
        PARNAM: String, // ledger / party name
        MAILNAM: String,
        CITY: String,
        GSTNO: String, // first 2 digits = GST state code, most reliable state source for this table
        PARADD: String,
        PARADD1: String,
        PARADD2: String,
        PHONE1: String,
        PHONE2: String,
        PHONE3: String,
        PHONE4: String,
        AREA: String,
        RSM: String,
        DSM: String,
        ASM: String,
        ROUT: String,
        SCODE: String, // ledger group code, matches GLEDGER.GCODE
        BALANCE: Number, // running ledger balance for this account
        SALCR: String,
        SALDR: String,
        PURCR: String,
        PURDR: String,
        RECCR: String,
        RECDR: String,
        PAYCR: String,
        PAYDR: String,
        TARGET: Number,
        LIMIT: Number,
        ORDNO: String,
    },
    { strict: false, collection: "order" }
);

// Use mongoose.models cache so Next.js hot-reload doesn't try to
// recompile the same model twice ("OverwriteModelError").
export const SalesMdis: Model<any> =
    mongoose.models.SalesMdis || mongoose.model("SalesMdis", SalesMdisSchema);

export const SalesDis: Model<any> =
    mongoose.models.SalesDis || mongoose.model("SalesDis", SalesDisSchema);

export const SubDis: Model<any> =
    mongoose.models.SubDis || mongoose.model("SubDis", SubDisSchema);

export const Pend: Model<any> =
    mongoose.models.Pend || mongoose.model("Pend", PendSchema);

export const GLedger: Model<any> =
    mongoose.models.GLedger || mongoose.model("GLedger", GLedgerSchema);

export const Product: Model<any> =
    mongoose.models.Product || mongoose.model("Product", ProductSchema);

export const ProBat: Model<any> =
    mongoose.models.ProBat || mongoose.model("ProBat", ProBatSchema);

export const OrderParty: Model<any> =
    mongoose.models.OrderParty || mongoose.model("OrderParty", OrderSchema);