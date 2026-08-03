import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);

    const totalProducts = await Product.countDocuments(
      combineFilters({ STATUS: "Y" }, companyVfpMatch)
    );

    const availableProducts = await Product.countDocuments(
      combineFilters({ STATUS: "Y", BALANCE: { $gt: 0 } }, companyVfpMatch)
    );

    const lowStock = await Product.countDocuments(
      combineFilters({ STATUS: "Y", BALANCE: { $gt: 0, $lte: 10 } }, companyVfpMatch)
    );

    const negativeStock = await Product.countDocuments(
      combineFilters({ STATUS: "Y", BALANCE: { $lt: 0 } }, companyVfpMatch)
    );

    const stockValue = await Product.aggregate([
      { $match: combineFilters({ STATUS: "Y" }, companyVfpMatch) },
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
      combineFilters({ STATUS: "Y", BALANCE: { $gt: 0, $lte: 10 } }, companyVfpMatch)
    )
      .limit(10)
      .lean();

    return NextResponse.json({
      totalProducts,
      availableProducts,
      lowStock,
      negativeStock,
      stockValue: stockValue[0]?.value || 0,
      lowStockProducts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}