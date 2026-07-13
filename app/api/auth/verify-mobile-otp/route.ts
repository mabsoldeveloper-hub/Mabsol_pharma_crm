import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Otp from "@/models/Otp";

export async function POST(req: Request) {
  try {

    await connectDB();

    const {
      mobile,
      otp,
    } = await req.json();

    const record =
      await Otp.findOne({

        mobile,

        type: "mobile",

      });

    if (!record) {

      return NextResponse.json({

        success: false,

        message: "OTP Not Found",

      });

    }

    if (
      new Date() >
      record.expiresAt
    ) {

      return NextResponse.json({

        success: false,

        message: "OTP Expired",

      });

    }

    if (
      record.otp !== otp
    ) {

      return NextResponse.json({

        success: false,

        message: "Invalid OTP",

      });

    }

    record.verified = true;

    await record.save();

    return NextResponse.json({

      success: true,

      message:
        "Mobile Verified",

    });

  } catch (err) {

    console.log(err);

    return NextResponse.json({

      success: false,

      message:
        "Verification Failed",

    });

  }
}