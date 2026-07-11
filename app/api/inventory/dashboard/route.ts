import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET() {
  try {
    await connectDB();

    const totalProducts = await Product.countDocuments({
      STATUS: "Y",
    });

    const availableProducts = await Product.countDocuments({
      STATUS: "Y",
      BALANCE: { $gt: 0 },
    });

    const lowStock = await Product.countDocuments({
      STATUS: "Y",
      BALANCE: {
        $gt: 0,
        $lte: 10,
      },
    });

    const negativeStock = await Product.countDocuments({
      STATUS: "Y",
      BALANCE: {
        $lt: 0,
      },
    });

    const stockValue = await Product.aggregate([
      {
        $group: {
          _id: null,
          value: {
            $sum: {
              $multiply: ["$BALANCE", "$PRATE"],
            },
          },
        },
      },
    ]);

    const lowStockProducts = await Product.find(
      {
        STATUS: "Y",
        BALANCE: {
          $gt: 0,
          $lte: 10,
        },
      },
      {
        PRODUCT: 1,
        BALANCE: 1,
        MRP: 1,
        PRATE: 1,
      }
    )
      .sort({ BALANCE: 1 })
      .limit(10);

    const negativeProducts = await Product.find(
      {
        STATUS: "Y",
        BALANCE: {
          $lt: 0,
        },
      },
      {
        PRODUCT: 1,
        BALANCE: 1,
        MRP: 1,
      }
    )
      .sort({ BALANCE: 1 })
      .limit(10);

    const topProducts = await Product.find(
      {
        STATUS: "Y",
      },
      {
        PRODUCT: 1,
        BALANCE: 1,
        MRP: 1,
      }
    )
      .sort({
        BALANCE: -1,
      })
      .limit(10);

    return NextResponse.json({
      success: true,

      totalProducts,

      availableProducts,

      lowStock,

      negativeStock,

      stockValue: stockValue[0]?.value || 0,

      lowStockProducts,

      negativeProducts,

      topProducts,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}