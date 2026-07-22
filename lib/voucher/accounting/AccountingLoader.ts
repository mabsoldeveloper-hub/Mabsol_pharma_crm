import GLedger from "@/models/GLedger";
import Pendings from "@/models/Pendings";

export async function loadAccountingVoucher(
  voucher: number
) {
  // All ledger entries of voucher

  const rows: any[] = await GLedger.find({
    VOUCHER: voucher,
  })
    .sort({
      DEBIT: -1,
      CREDIT: -1,
    })
    .lean();

  if (!rows.length) {
    throw new Error("Accounting voucher not found");
  }

  // Ledger Codes

  const codes = [...new Set(rows.map((x) => x.CODE))];

  // Ledger Names

  const ledgers: any[] = await Pendings.find({
    ORD: { $in: codes },
  }).lean();

  const ledgerMap = new Map<string, any>();

  ledgers.forEach((l: any) => {
    ledgerMap.set(l.ORD, l);
  });

  const entries = rows.map((row: any) => {
    const ledger = ledgerMap.get(row.CODE);

    return {
      code: row.CODE,

      ledger:
        ledger?.NAME || row.CODE,

      debit: Number(row.DEBIT || 0),

      credit: Number(row.CREDIT || 0),

      remark: row.REMARK1,

      type: row.TYPE,

      book: row.BOOK,
    };
  });

  const totalDebit = entries.reduce(
    (s, x) => s + x.debit,
    0
  );

  const totalCredit = entries.reduce(
    (s, x) => s + x.credit,
    0
  );

  return {
    voucherType: rows[0].BOOK,

    header: {
      voucher,

      date: rows[0].DATE,

      dueDate: rows[0].PDATE,

      narration: rows[0].REMARK1,

      type: rows[0].BOOK,
    },

    entries,

    totals: {
      debit: totalDebit,

      credit: totalCredit,
    },

    raw: rows,
  };
}