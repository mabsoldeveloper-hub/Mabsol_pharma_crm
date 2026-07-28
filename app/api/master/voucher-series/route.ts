import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import VoucherSeries from "@/models/VoucherSeries";
import { formatVoucherNumber } from "@/lib/voucherSeriesHelper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    let seriesList = await VoucherSeries.find({}).sort({ voucherType: 1, isDefault: -1, createdAt: -1 }).lean();

    // Auto-seed default series if none exist
    if (!seriesList || seriesList.length === 0) {
      await VoucherSeries.insertMany([
        {
          seriesName: "Standard Tax Invoice Series",
          voucherType: "SALES",
          prefix: "INV-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
        },
        {
          seriesName: "Standard Proforma / Kaccha Series",
          voucherType: "PROFORMA",
          prefix: "PRF-",
          suffix: "",
          nextNumber: 1001,
          padding: 5,
          isDefault: true,
          status: "Active",
        },
      ]);

      seriesList = await VoucherSeries.find({}).sort({ voucherType: 1, isDefault: -1 }).lean();
    }

    const formattedList = seriesList.map((s: any) => ({
      ...s,
      previewVcn: formatVoucherNumber(s.prefix, s.nextNumber, s.padding, s.suffix),
    }));

    return NextResponse.json({
      success: true,
      data: formattedList,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const seriesName = String(body.seriesName || "").trim();
    const voucherType = String(body.voucherType || "SALES").toUpperCase();
    const prefix = String(body.prefix || "").trim();
    const suffix = String(body.suffix || "").trim();
    const nextNumber = Number(body.nextNumber || 1001);
    const padding = Number(body.padding || 5);
    const isDefault = Boolean(body.isDefault);
    const status = body.status === "Inactive" ? "Inactive" : "Active";

    if (!seriesName) {
      return NextResponse.json({ success: false, message: "Series Name is required" }, { status: 400 });
    }

    // If set as default, remove default flag from other series of same voucherType
    if (isDefault) {
      await VoucherSeries.updateMany({ voucherType }, { $set: { isDefault: false } });
    }

    const newSeries = await VoucherSeries.create({
      seriesName,
      voucherType,
      prefix,
      suffix,
      nextNumber,
      padding,
      isDefault,
      status,
    });

    return NextResponse.json({
      success: true,
      message: "Voucher Series created successfully",
      data: newSeries,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
