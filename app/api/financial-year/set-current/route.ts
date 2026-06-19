import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

export async function POST(
  req: Request
) {
  try {

    await connectDB();

    const {
      companyId,
      fyId,
    } = await req.json();

    await FinancialYear.updateMany(
        {},
        {
          isCurrent:false
        }
       );
       
       await FinancialYear.findByIdAndUpdate(
        fyId,
        {
          isCurrent:true
        }
       );

   

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    return NextResponse.json(
      {
        error: "Failed",
      },
      {
        status: 500,
      }
    );
  }
}