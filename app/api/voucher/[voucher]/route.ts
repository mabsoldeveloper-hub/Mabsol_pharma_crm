import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import { getVoucher } from "@/lib/voucher/VoucherEngine";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      voucher: string;
    }>;
  }
) {
  try {
    await connectDB();

    const { voucher } = await params;

    const voucherNo = Number(voucher);

    if (isNaN(voucherNo)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Voucher Number",
        },
        {
          status: 400,
        }
      );
    }

    const data = await getVoucher(voucherNo);

    return NextResponse.json({
      success: true,

      data,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,

        message:
          err.message ||
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}