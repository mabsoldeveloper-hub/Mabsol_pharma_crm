import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Otp from "@/models/Otp";
import { sendEmailOTP } from "@/lib/mail";

import jwt from "jsonwebtoken";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    let currentUser = await getCurrentUser();
    let email = currentUser?.email || "";

    if (!email) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
          if (payload && payload.id) {
            currentUser = await User.findById(payload.id);
            email = currentUser?.email || "";
          }
        } catch {}
      }
    }

    if (!email) {
      const body = await req.json().catch(() => ({}));
      if (body.email) {
        const user = await User.findOne({ email: body.email.toLowerCase().trim() });
        if (user) {
          email = user.email;
        }
      }
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { email, type: "email" },
      {
        email,
        type: "email",
        otp,
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
      },
      { upsert: true, new: true }
    );

    // Send email OTP
    let emailSent = false;
    try {
      await sendEmailOTP(email, otp);
      emailSent = true;
    } catch (mailErr: any) {
      console.error("Email send error (SMTP might not be configured):", mailErr);
      // In dev environment or if SMTP is unconfigured, log OTP for debugging
      console.log(`[FILE UNLOCK OTP FOR DEV] Email: ${email} | OTP: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Verification OTP sent to ${email}`
        : `Verification code generated for ${email}. (Check server console if SMTP is not set up)`,
      // For dev/testing ease when SMTP is unconfigured
      ...(process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {}),
    });
  } catch (err: any) {
    console.error("SEND FILE UNLOCK OTP ERROR:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
