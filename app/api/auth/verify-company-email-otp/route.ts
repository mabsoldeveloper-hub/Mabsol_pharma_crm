import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Otp from "@/models/Otp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: "Email and OTP are required" });
    }

    const record = await Otp.findOne({ email: email.toLowerCase().trim(), type: "company_email" });

    if (!record) {
      return NextResponse.json({ success: false, message: "OTP not found. Please request a new one." });
    }

    if (record.verified) {
      return NextResponse.json({ success: true, message: "Email already verified" });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== String(otp).trim()) {
      await Otp.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } });
      return NextResponse.json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    await Otp.findByIdAndUpdate(record._id, { $set: { verified: true } });

    return NextResponse.json({ success: true, message: "Email verified successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
