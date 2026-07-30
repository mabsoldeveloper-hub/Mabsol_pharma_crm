import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Otp from "@/models/Otp";
import { sendEmailOTP } from "@/lib/mail";
import { validateEmail } from "@/lib/constants/companyValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, email, otp } = body;

    const cleanEmail = (email || "").toString().trim().toLowerCase();

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Action 1: Send Email Verification OTP
    if (action === "send_otp") {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

      await Otp.findOneAndUpdate(
        { email: cleanEmail, type: "email" },
        {
          email: cleanEmail,
          type: "email",
          otp: generatedOtp,
          verified: false,
          attempts: 0,
          expiresAt,
        },
        { upsert: true, new: true }
      );

      // Send OTP via SMTP using nodemailer engine
      await sendEmailOTP(cleanEmail, generatedOtp);

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${cleanEmail}. Please check your inbox.`,
      });
    }

    // Action 2: Verify Email OTP
    if (action === "verify_otp") {
      if (!otp || otp.toString().trim().length !== 6) {
        return NextResponse.json(
          { success: false, error: "Please enter the 6-digit verification code." },
          { status: 400 }
        );
      }

      const cleanOtp = otp.toString().trim();
      const otpRecord = await Otp.findOne({
        email: cleanEmail,
        type: "email",
      });

      if (!otpRecord) {
        return NextResponse.json(
          { success: false, error: "No OTP request found for this email. Please request a new code." },
          { status: 400 }
        );
      }

      if (new Date() > new Date(otpRecord.expiresAt)) {
        return NextResponse.json(
          { success: false, error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (otpRecord.otp !== cleanOtp) {
        otpRecord.attempts = (otpRecord.attempts || 0) + 1;
        await otpRecord.save();

        return NextResponse.json(
          { success: false, error: "Invalid verification code. Please check your code and try again." },
          { status: 400 }
        );
      }

      // Mark OTP as verified
      otpRecord.verified = true;
      await otpRecord.save();

      return NextResponse.json({
        success: true,
        message: "Email address verified successfully!",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action type. Expected 'send_otp' or 'verify_otp'." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process email verification",
      },
      { status: 500 }
    );
  }
}
