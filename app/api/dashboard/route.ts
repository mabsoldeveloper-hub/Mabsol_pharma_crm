import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import User from "@/models/User";
import Customer from "@/models/Customer";
import Company from "@/models/Company";
import Product from "@/models/Product";

export async function GET() {

  try {

    await connectDB();

    // ==============================
    // Total Products
    // ==============================
    const products =
    await Product.countDocuments({
      STATUS: "Y",
    });

    // ==============================
    // Low Stock
    // ==============================
    const lowStock =
    await Product.countDocuments({
      BALANCE: {
        $lte: 10,
      },
      STATUS: "Y",
    });

    // negative stock
    const negativeStock =
    await Product.countDocuments({
      BALANCE: {
        $lt: 0,
      },
      STATUS: "Y",
    });

    //Active / Inactive Customers
    const activeCustomers =
      await Customer.countDocuments({
        STATUS: "Y",
      });

    const inactiveCustomers =
      await Customer.countDocuments({
        STATUS: {
          $ne: "Y",
        },
      });
    
    // ==============================
    // Total Employees
    // ==============================

    const employees =
      await User.countDocuments({
        status: "Active",
      });

    // ==============================
    // Total Customers
    // ==============================

    const customers =
      await Customer.countDocuments();

    // ==============================
    // Total Companies
    // ==============================

    const companies =
      await Company.countDocuments();

    // ==============================
    // Outstanding / Credit / Debit
    // ==============================

    const totals =
      await Customer.aggregate([
        {
          $group: {
            _id: null,

            outstanding: {
              $sum: "$BALANCE",
            },

            credit: {
              $sum: "$CREDIT",
            },

            debit: {
              $sum: "$DEBIT",
            },
          },
        },
      ]);

    return NextResponse.json({
      success: true,
      products,

      activeCustomers,

      inactiveCustomers,

      lowStock,

      negativeStock,

      employees,
      customers,
      companies,
      outstanding:
        totals[0]?.outstanding || 0,
      credit:
        totals[0]?.credit || 0,
      debit:
        totals[0]?.debit || 0,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,

      message: error.message,

    });

  }

}