import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";

import { sendWhatsAppOTP } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { mobile } = await req.json();

    if (!mobile) {
      return NextResponse.json({
        success: false,
        message: "Mobile Number Required",
      });
    }

    const exists = await User.findOne({
      mobile,
    });

    if (exists) {
      return NextResponse.json({
        success: false,
        message: "Mobile already registered",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await Otp.findOneAndUpdate(
      {
        mobile,
        type: "mobile",
      },
      {
        otp,
        verified: false,
        expiresAt: new Date(
          Date.now() + 5 * 60 * 1000
        ),
      },
      {
        upsert: true,
      }
    );


    const saved = await Otp.findOne({
      mobile,
      type: "mobile",
    });
    
    console.log("Saved OTP Record:", saved);

    sendWhatsAppOTP(
      mobile,
      otp
    ).catch((err) => {
      console.error("WhatsApp OTP failed in background:", err);
    });

    return NextResponse.json({
      success: true,
      message: "OTP Sent Successfully",
    });

  } catch (err) {

    console.log(err);

    return NextResponse.json({
      success: false,
      message: "Failed to Send OTP",
    });

  }
}