import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";

import SalesMdis from "@/models/SalesMdis";
import GLedger from "@/models/GLedger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectDB();

    const { code } = await params;

    // =========================
    // Customer
    // =========================

    const customer: any = await Customer.findOne({
      ORDNO: code,
    }).lean();

    if (!customer) {
      return NextResponse.json({
        success: false,
        message: "Customer not found",
      });
    }

    // =========================
    // Ledger Entries
    // =========================

    const ledgerRows: any[] = await GLedger.find({
      CODE: code,
    })
      .sort({ DATE: 1, VOUCHER: 1 })
      .lean();

    let runningBalance = Number(customer.OPNING || 0);

    const ledger = ledgerRows.map((row: any) => {
      const debit = Number(row.DEBIT || 0);
      const credit = Number(row.CREDIT || 0);

      runningBalance += debit;
      runningBalance -= credit;

      return {
        date: row.DATE,
        voucher: row.VOUCHER,
        type: row.TYPE,
        billNo: row.REMARK1 || "",
        particulars:
          row.BOOK === "S"
            ? "Sales Invoice"
            : row.BOOK === "R"
            ? "Receipt"
            : row.BOOK === "P"
            ? "Purchase"
            : row.BOOK || "",

        debit,
        credit,
        balance: runningBalance,
      };
    });

    // =========================
    // Sales Summary
    // =========================

    const invoices = await SalesMdis.find(
      {
        CODEP: code,
      },
      {
        FINAL: 1,
      }
    ).lean();

    const totalSale = invoices.reduce(
      (sum: number, x: any) => sum + Number(x.FINAL || 0),
      0
    );

    const totalDebit = ledger.reduce(
      (sum: number, x: any) => sum + x.debit,
      0
    );

    const totalCredit = ledger.reduce(
      (sum: number, x: any) => sum + x.credit,
      0
    );

    return NextResponse.json({
      success: true,

      customer: {
        code: customer.ORDNO,
        name: customer.PARNAM,
        city: customer.CITY,
        state: customer.STATE,
        phone: customer.PHONE1 || customer.PHONE4,
        gst: customer.GSTNO,
        dlno: customer.DLNO,
        opening: Number(customer.OPNING || 0),
        currentBalance: Number(customer.BALANCE || 0),
      },

      summary: {
        opening: Number(customer.OPNING || 0),
        debit: totalDebit,
        credit: totalCredit,
        sale: totalSale,
        closing: runningBalance,
      },

      ledger,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}