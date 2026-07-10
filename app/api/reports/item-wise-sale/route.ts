import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ItemSale from "@/models/ItemSale";

export async function GET() {
  try {
    await connectDB();

    const data = await ItemSale.aggregate([
      {
        $group: {
          _id: "$PCODE",
          totalQty: { $sum: "$QTY" },
          totalAmount: { $sum: "$AMOUNT" },
        },
      },
      {
        $sort: {
          totalAmount: -1,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}