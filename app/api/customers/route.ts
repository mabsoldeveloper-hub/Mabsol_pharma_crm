import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function GET() {

  await connectDB();

  const customers = await Customer.find(
    {},
    {
      PARNAM: 1,
      CODEP: 1,
      CITY: 1,
      PHONE1: 1,
      GSTNO: 1,
      DLNO: 1,
      BALANCE: 1,
      STATUS: 1,
    }
  )
    .sort({ PARNAM: 1 });

  return NextResponse.json(customers);

}