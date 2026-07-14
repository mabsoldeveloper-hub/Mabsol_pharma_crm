import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendOtpEmail } from "@/lib/sendEmail";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({
        success: false,
        message: "Invalid Password",
      });
    }

    // Credentials are correct — generate an OTP and email it.
    // We do NOT issue the JWT / set the auth cookie here; that only
    // happens after the OTP is verified in /api/auth/verify-otp.
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Remove any previous OTPs for this email, then store the new one
    await Otp.deleteMany({ email: user.email });
    await Otp.create({
      email: user.email,
      type: "email",
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    await sendOtpEmail(user.email, otp);

    return NextResponse.json({
      success: true,
      otpRequired: true,
      email: user.email,
      message: "Verification code sent to your email",
    });
  } catch (error: unknown) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      },
      { status: 500 }
    );
  }
} 