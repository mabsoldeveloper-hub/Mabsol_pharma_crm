import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

export async function GET(
    req: Request
  ) {
  
    await connectDB();
  
    const { searchParams } =
      new URL(req.url);
  
    const companyId =
      searchParams.get(
        "companyId"
      );
  
    const query =
      companyId
        ? { companyId }
        : {};
  
    const years =
      await FinancialYear.find(
        query
      )
      .populate(
        "companyId",
        "companyName"
      );
  
    return NextResponse.json(
      years
    );
  }


export async function POST(
  req: Request
) {

  try {

    await connectDB();

    const data = await req.json();

    if (data.isCurrent) {

      await FinancialYear.updateMany(
        {
          companyId: data.companyId,
        },
        {
          isCurrent: false,
        }
      );

    }

    const fy =
      await FinancialYear.create(data);

    return NextResponse.json(fy);

  } catch (error: any) {

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );

  }

}