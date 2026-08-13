import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Otp from "@/models/Otp";

export async function POST(req: Request) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    const email = currentUser.email;
    const body = await req.json().catch(() => ({}));
    const { otp } = body;

    if (!otp) {
      return NextResponse.json(
        { success: false, message: "OTP code is required." },
        { status: 400 }
      );
    }

    const record = await Otp.findOne({ email, type: "email" });

    if (!record) {
      return NextResponse.json(
        { success: false, message: "OTP not found. Please request a new code." },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { success: false, message: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (record.otp !== String(otp).trim()) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return NextResponse.json(
        { success: false, message: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // OTP is valid! Mark as verified
    record.verified = true;
    await record.save();

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. File names unlocked for 5 minutes.",
      unlockedUntil: Date.now() + 5 * 60 * 1000, // 5 minutes in ms
    });
  } catch (err: any) {
    console.error("VERIFY FILE UNLOCK OTP ERROR:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
