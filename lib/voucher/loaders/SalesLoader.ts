import SalesDis from "@/models/SalesDis";
import Order from "@/models/Order";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";

export async function loadSalesVoucher(header: any) {
  // ======================================
  // Customer
  // ======================================

  const customer: any = await Order.findOne({
    ORDNO: header.CODEP,
  }).lean();

  // ======================================
  // Voucher Items
  // ======================================

  const rows: any[] = await SalesDis.find({
    VOUCHER: header.VOUCHER,
  })
    .sort({
      CODE: 1,
    })
    .lean();

  // ======================================
  // Products
  // ======================================

  const productCodes = [...new Set(rows.map((x) => Number(x.CODE)))];

  const products: any[] = await Product.find({
    CODE: { $in: productCodes },
  }).lean();

  const productMap = new Map<number, any>();

  products.forEach((p: any) => {
    productMap.set(Number(p.CODE), p);
  });

  // ======================================
  // Batch Master
  // ======================================

  const batchList: any[] = await ProductBatch.find({
    CODE: { $in: productCodes },
  }).lean();

  const batchMap = new Map<string, any>();

  batchList.forEach((b: any) => {
    batchMap.set(`${b.CODE}_${b.BATCHNO}`, b);
  });

  // ======================================
  // Item Preparation
  // ======================================

  const items = rows.map((row: any, index: number) => {
    const product = productMap.get(Number(row.CODE));
  
    const batch = batchMap.get(`${row.CODE}_${row.BATCH}`);
  
    const taxableAmount = Number(
      row.AMMMWOD || row.AMMMOUNT || 0
    );
  
    const cgstPercent = Number(row.CGST || 0);
    const sgstPercent = Number(row.SSTA || 0);
    const igstPercent = Number(row.IGST || 0);
  
    const cgstAmount = Number(row.CGSTAMO || 0);
    const sgstAmount = Number(row.SSTAAMO || 0);
    const igstAmount = Number(row.IGSTAMO || 0);
  
    return {
      srNo: index + 1,
  
      code: row.CODE,
  
      product: product?.PRODUCT || "",
  
      billName: product?.BILLNAME || "",
  
      packing: product?.PACKING || "",
  
      unit: product?.UNIT || "",
  
      batch: row.BATCH,
  
      mfd: batch?.MFD || row.MFD || "",
  
      exp: batch?.EXP || row.EXP || "",
  
      qty: Number(row.QTY || 0),
  
      free: Number(row.FREE || 0),
  
      rate: Number(row.RATE || 0),
  
      mrp: Number(row.MRP || product?.MRP || 0),
  
      discount:
        Number(row.DISC1 || 0) +
        Number(row.DISC2 || 0),
  
      // GST %
  
      cgst: cgstPercent,
  
      sgst: sgstPercent,
  
      igst: igstPercent,
  
      gstPercent:
        cgstPercent +
        sgstPercent +
        igstPercent,
  
      // GST Amount
  
      cgstAmount,
  
      sgstAmount,
  
      igstAmount,
  
      taxAmount:
        cgstAmount +
        sgstAmount +
        igstAmount,
  
      taxableAmount,
  
      amount: Number(
        (
          taxableAmount +
          cgstAmount +
          sgstAmount +
          igstAmount
        ).toFixed(2)
      ),
    };
  });

  // ======================================
  // Totals
  // ======================================
  const totals = {
    qty: items.reduce((s, x) => s + x.qty, 0),
  
    free: items.reduce((s, x) => s + x.free, 0),
  
    taxableAmount: Number(
        items
          .reduce((s, x) => s + x.taxableAmount, 0)
          .toFixed(2)
      ),
      
      cgst: Number(
        items
          .reduce((s, x) => s + x.cgstAmount, 0)
          .toFixed(2)
      ),
      
      sgst: Number(
        items
          .reduce((s, x) => s + x.sgstAmount, 0)
          .toFixed(2)
      ),
      
      igst: Number(
        items
          .reduce((s, x) => s + x.igstAmount, 0)
          .toFixed(2)
      ),
      
      totalTax: Number(
        items
          .reduce((s, x) => s + x.taxAmount, 0)
          .toFixed(2)
      ),
  
   // grandTotal: Number(header.FINAL || 0),

   grandTotal: Number( Number(header.FINAL || 0).toFixed(2)),

  };

  // ======================================
  // Return Common ERP Object
  // ======================================

  return {
    voucherType: header.TYPE,

    header: {
      voucher: header.VOUCHER,

      voucherNo: header.VCN,

      type: header.TYPE,

      date: header.DATE,

      challan: header.CHALLAN,

      dueDate: header.PDATE,

      final: Number(header.FINAL || 0),

      round: Number(header.ROUND || 0),

      tax: Number(header.TAXAMO || 0),

      freight: Number(header.FREIGHT || 0),

      remarks: header.REMARK1,
    },

    customer: customer
      ? {
          code: customer.ORDNO,

          name: customer.PARNAM,

          address: customer.ADDRESS,

          city: customer.CITY,

          state: customer.STATE,

          mobile:
            customer.PHONE1 ||
            customer.PHONE4,

          gst: customer.GSTNO,

          dl: customer.DLNO,
        }
      : null,

    items,

    totals,

    taxes: {
        cgst: totals.cgst,
      
        sgst: totals.sgst,
      
        igst: totals.igst,
      
        totalTax: totals.totalTax,
      },

    rawHeader: header,
  };
}