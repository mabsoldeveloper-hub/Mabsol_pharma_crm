// import { NextResponse } from "next/server";

// import connectDB from "@/lib/mongodb";

// import Customer from "@/models/Customer";

// export async function GET(
// req:any,
// {params}:any
// ){

// await connectDB();

// const customer=
// await Customer.findById(
// params.id
// );

// return NextResponse.json(
// customer
// );

// }
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  console.log("ID =", id);

  const customer = await Customer.findById(id);

  console.log(customer);

  return NextResponse.json(customer);
}