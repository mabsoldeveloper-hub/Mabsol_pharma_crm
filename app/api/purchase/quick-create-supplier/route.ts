import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, gst, phone, address, city } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Supplier / Party Name is required" },
        { status: 400 }
      );
    }

    const codeP = `VEND-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSupplier = await Customer.create({
      PARNAM: name.trim().toUpperCase(),
      NAME: name.trim().toUpperCase(),
      CODEP: codeP,
      ORDNO: codeP,
      GSTIN: (gst || "").trim().toUpperCase(),
      GSTNO: (gst || "").trim().toUpperCase(),
      PHONE: (phone || "").trim(),
      ADDRESS: (address || "").trim(),
      CITY: (city || "").trim(),
      ACGROUP: "D", // Sundry Creditors
      TYPE: "CREDITOR",
    });

    const supplierData = {
      id: String(newSupplier._id),
      code: codeP,
      name: name.trim().toUpperCase(),
      gst: (gst || "").trim().toUpperCase(),
      phone: (phone || "").trim(),
      city: (city || "").trim(),
      address: (address || "").trim(),
      isCreditor: true,
    };

    return NextResponse.json({
      success: true,
      message: "New Supplier registered successfully",
      supplier: supplierData,
    });
  } catch (error: any) {
    console.error("Quick Create Supplier Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create supplier" },
      { status: 500 }
    );
  }
}
