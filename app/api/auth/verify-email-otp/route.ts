import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Otp from "@/models/Otp";

export async function POST(req: Request) {

  try {

    await connectDB();

    const { email, otp } = await req.json();

    if (!email || !otp) {

      return NextResponse.json({
        success: false,
        message: "Email and OTP are required",
      });

    }

    const record = await Otp.findOne({
      email,
      type: "email",
    });

    if (!record) {

      return NextResponse.json({
        success: false,
        message: "OTP not found",
      });

    }

    if (record.verified) {

      return NextResponse.json({
        success: true,
        message: "Email already verified",
      });

    }

    if (new Date() > record.expiresAt) {

      return NextResponse.json({
        success: false,
        message: "OTP has expired",
      });

    }

    if (record.otp !== otp) {

      return NextResponse.json({
        success: false,
        message: "Invalid OTP",
      });

    }

    record.verified = true;

    await record.save();

    return NextResponse.json({
      success: true,
      message: "Email Verified Successfully",
    });

  } catch (err) {

    console.log(err);

    return NextResponse.json({
      success: false,
      message: "Verification Failed",
    });

  }

}