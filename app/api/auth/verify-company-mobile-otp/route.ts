import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Otp from "@/models/Otp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { mobile, otp } = await req.json();

    if (!mobile || !otp) {
      return NextResponse.json({ success: false, message: "Mobile and OTP are required" });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "");
    const record = await Otp.findOne({ mobile: cleanMobile, type: "company_mobile" });

    if (!record) {
      return NextResponse.json({ success: false, message: "OTP not found. Please request a new one." });
    }

    if (record.verified) {
      return NextResponse.json({ success: true, message: "Mobile already verified" });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== String(otp).trim()) {
      await Otp.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } });
      return NextResponse.json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    await Otp.findByIdAndUpdate(record._id, { $set: { verified: true } });

    return NextResponse.json({ success: true, message: "Mobile verified successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
