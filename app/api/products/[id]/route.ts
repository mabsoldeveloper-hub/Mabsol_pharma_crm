
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  await connectDB();

  const { id } = await params;

  const product = await Product.findById(id);

  return NextResponse.json(product);

}