import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendWhatsAppOTP } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { mobile } = await req.json();

    if (!mobile) {
      return NextResponse.json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "");

    const exists = await User.findOne({ mobile: cleanMobile });
    if (exists) {
      return NextResponse.json({
        success: false,
        message: "An account with this mobile number already exists. Please sign in.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { mobile: cleanMobile, type: "mobile" },
      {
        $set: {
          mobile: cleanMobile,
          type: "mobile",
          otp,
          verified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      },
      { upsert: true, new: true }
    );

    // Send WhatsApp / SMS OTP
    const sendResult = await sendWhatsAppOTP(cleanMobile, otp);
    const isLiveDelivered = Boolean(sendResult.provider && sendResult.provider !== "local_log");

    return NextResponse.json({
      success: true,
      message: isLiveDelivered
        ? `Verification code sent to +91 ${cleanMobile}`
        : `Verification code generated: ${otp} (Local/Dev Mode)`,
      otp: otp,
      deliveredLive: isLiveDelivered,
      provider: sendResult.provider,
    });
  } catch (err: any) {
    console.error("MOBILE OTP ERROR:", err);
    return NextResponse.json({
      success: false,
      message: err?.message || "Failed to send verification code",
    });
  }
}