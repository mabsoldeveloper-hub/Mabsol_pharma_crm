import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import User from "@/models/User";
import Otp from "@/models/Otp";

import { sendEmailOTP } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        message: "Email is required",
      });
    }

    const existing = await User.findOne({
      email,
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: "Email already exists",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await Otp.findOneAndUpdate(
      {
        email,
        type: "email",
      },
      {
        email,
        type: "email",
        otp,
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      {
        upsert: true,
        new: true,
      }
    );



    const saved = await Otp.findOne({
      email,
      type: "email",
    });
    
    console.log(saved);
    // Otp.findOne(
    //   {
    //     email,
    //     type: "email",
    //   },
    //   {
    //     otp,
    //     verified: false,
    //     expiresAt: new Date(
    //       Date.now() + 5 * 60 * 1000
    //     ),
    //   },
    //   {
    //     upsert: false,
    //   }
    // );

    await sendEmailOTP(email, otp);

    return NextResponse.json({
      success: true,
      message: "OTP Sent Successfully",
    });
  } catch (err: any) {

    console.error("EMAIL OTP ERROR");
  
    console.error(err);
  
    return NextResponse.json({
      success: false,
      message: err.message,
    });
  
  }
}