import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { validateMobile } from "@/lib/constants/validation.constant";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { mobile } = await req.json();

    // Validate format first
    const mobileErr = validateMobile(mobile || "");
    if (mobileErr) {
      return NextResponse.json({ success: false, message: mobileErr });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "");

    // ── Check if mobile is already registered ─────────────────────────────────
    const existingUser = await User.findOne({ mobile: cleanMobile });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: "This mobile number is already registered to another account. Please use a different number.",
      });
    }

    // Generate 6-digit OTP and store
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { mobile: cleanMobile, type: "company_mobile" },
      {
        $set: {
          mobile: cleanMobile,
          type: "company_mobile",
          otp,
          verified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      },
      { upsert: true, new: true }
    );

    console.log(`\n[COMPANY MOBILE OTP] +91${cleanMobile} → ${otp}`);

    const sendResult = await sendWhatsAppOTP(cleanMobile, otp);
    const isLive = Boolean(sendResult.provider && sendResult.provider !== "local_log");

    return NextResponse.json({
      success: true,
      message: isLive
        ? `Verification code sent to +91 ${cleanMobile}`
        : `OTP (Dev Mode): ${otp}`,
      otp: !isLive ? otp : undefined,
      deliveredLive: isLive,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
