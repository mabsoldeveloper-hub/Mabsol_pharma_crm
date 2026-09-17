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

    const MAX_ATTEMPTS = 5;

    if (record.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteMany({ mobile, type: "mobile" });
      return NextResponse.json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    if (
      record.otp !== otp
    ) {
      record.attempts += 1;
      await record.save();

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