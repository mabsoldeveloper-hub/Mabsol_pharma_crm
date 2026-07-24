import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import SaleType from "@/models/SaleType";


export async function GET() {
    try {
      await connectDB();
  
      const companies = await SaleType.find({
        SGCODE: "ZZZZZZ",
      })
        .select("SCODE SNAME")
        .sort({ SNAME: 1 });
  
      const data = companies.map((item) => ({
        _id: item._id,
        companyCode: item.SCODE,
        companyName: item.SNAME,
        status: "Active",
      }));
  
      return NextResponse.json({
        success: true,
        count: data.length,
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