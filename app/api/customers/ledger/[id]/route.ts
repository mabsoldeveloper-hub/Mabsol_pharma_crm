import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";
import SalesMdis from "@/models/SalesMdis";
import GLedger from "@/models/GLedger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // =========================
    // Customer (Fetch by Mongo _id)
    // =========================
    const customer: any = await Customer.findById(id).lean();

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found",
        },
        { status: 404 }
      );
    }

    // =========================
    // Ledger Entries
    // =========================

    const ledgerRows: any[] = await GLedger.find({
      CODE: customer.ORDNO,
    })
      .sort({ DATE: 1, VOUCHER: 1 })
      .lean();

    let runningBalance = Number(customer.OPNING || 0);

    const ledger = ledgerRows.map((row: any) => {
      const debit = Number(row.DEBIT || 0);
      const credit = Number(row.CREDIT || 0);
    
      runningBalance += debit;
      runningBalance -= credit;
    
      let particulars = row.BOOK || "";
    
      switch (row.BOOK) {
        case "S":
          particulars = "Sales Invoice";
          break;
    
        case "R":
          particulars = "Receipt";
          break;
    
        case "P":
          particulars = "Purchase";
          break;
    
        case "J":
          particulars = "Journal";
          break;
    
        case "OB":
          particulars = "Opening Balance";
          break;
      }
    
      return {
        date: row.DATE,
        voucher: row.VOUCHER,
        billNo: row.REMARK1 || row.BILLNO || "",
        particulars,
        debit,
        credit,
        balance: runningBalance,
        type: row.TYPE,
        book: row.BOOK,
      };
    });

    // =========================
    // Sales Summary
    // =========================

    // const invoices = await SalesMdis.find(
    //   {
    //     CODEP: customer.ORDNO,
    //   },
    //   {
    //     FINAL: 1,
    //   }
    // ).lean();

    // const totalSale = invoices.reduce(
    //   (sum: number, x: any) => sum + Number(x.FINAL || 0),
    //   0
    // );
    const invoices = await SalesMdis.find(
      {
        CODEP: customer.ORDNO,
      },
      {
        VCN: 1,
        DATE: 1,
        TYPE: 1,
        FINAL: 1,
        AMOUNTT: 1,
        TAXAMO: 1,
        ROUND: 1,
      }
    )
      .sort({ DATE: -1 })
      .lean();
    
    const totalBills = invoices.length;
    
    const totalSales = invoices.reduce(
      (sum: number, x: any) =>
        sum + Number(x.FINAL || 0),
      0
    );
    
    const lastBill = invoices[0] || null;

    // Temporary Outstanding Logic
// Baad me Receipt Adjustment karenge

const outstandingInvoices = invoices.filter(
  (x: any) => Number(x.FINAL || 0) > 0
);

const outstandingBills =
  outstandingInvoices.length;

const outstandingAmount =
  outstandingInvoices.reduce(
    (sum: number, x: any) =>
      sum + Number(x.FINAL || 0),
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
        id: customer._id,
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

      // summary: {
      //   opening: Number(customer.OPNING || 0),
      //   debit: totalDebit,
      //   credit: totalCredit,
      //   sale: totalSale,
      //   closing: runningBalance,
      // },
      summary: {
        opening: Number(customer.OPNING || 0),
      
        debit: totalDebit,
      
        credit: totalCredit,
      
        closing: runningBalance,
      
        totalBills,
      
        totalSales,
      
        outstandingBills,
      
        outstandingAmount,
      
        ledgerBalance:
          Number(customer.BALANCE || 0),
      
        lastBillNo:
          lastBill?.VCN || "",
      
        lastBillDate:
          lastBill?.DATE || "",
      },




      ledger,
      
      invoices
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