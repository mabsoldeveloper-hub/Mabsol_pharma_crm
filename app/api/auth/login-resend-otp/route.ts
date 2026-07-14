import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import User from "@/models/User";
import LoginOtp from "@/models/LoginOtp";


import { sendLoginOTPEmail } from "@/lib/loginEmail";


import { sendWhatsAppOTP } from "@/lib/whatsapp";

const OTP_EXPIRY = 5 * 60 * 1000;

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

    const user = await User.findOne({

      email: email.toLowerCase().trim(),

    });

    if (!user) {

      return NextResponse.json({

        success: false,

        message: "User not found",

      });

    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await LoginOtp.findOneAndUpdate(

      {
        email: user.email,
      },

      {

        email: user.email,

        mobile: user.mobile,

        otp,

        verified: false,

        attempts: 0,

        expiresAt: new Date(
          Date.now() + OTP_EXPIRY
        ),

      },

      {

        upsert: true,

        returnDocument: "after",

      }

    );

    await sendLoginOTPEmail(
      user.email,
      otp
    );

    await sendWhatsAppOTP(
      user.mobile,
      otp
    );

    return NextResponse.json({

      success: true,

      message: "OTP Sent Successfully",

    });

  }

  catch (err: any) {

    console.log(err);

    return NextResponse.json({

      success: false,

      message: err.message || "Resend Failed",

    });

  }

}