import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, hsn, purchaseRate, mrp, gstPercent, unit, companyName } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Product Name is required" },
        { status: 400 }
      );
    }

    const codeP = `PROD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProduct = await Product.create({
      PRODUCT: name.trim().toUpperCase(),
      NAME: name.trim().toUpperCase(),
      PNAME: name.trim().toUpperCase(),
      CODE: codeP,
      CODEP: codeP,
      HSN: (hsn || "30049099").trim(),
      HSNCODE: (hsn || "30049099").trim(),
      PRATE: Number(purchaseRate || 0),
      PURRATE: Number(purchaseRate || 0),
      MRP: Number(mrp || 0),
      IGST: Number(gstPercent || 12),
      GST: Number(gstPercent || 12),
      PACK: unit || "Box",
      UNIT: unit || "Box",
      COMPANY: (companyName || "").trim(),
    });

    const productData = {
      id: String(newProduct._id),
      code: codeP,
      name: name.trim().toUpperCase(),
      hsn: (hsn || "30049099").trim(),
      purchaseRate: Number(purchaseRate || 0),
      mrp: Number(mrp || 0),
      gstPercent: Number(gstPercent || 12),
      unit: unit || "Box",
      companyName: (companyName || "").trim(),
    };

    return NextResponse.json({
      success: true,
      message: "New Product registered successfully",
      product: productData,
    });
  } catch (error: any) {
    console.error("Quick Create Product Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
