import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";

import User from "@/models/User";
import LoginOtp from "@/models/LoginOtp";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {

  try {

    await connectDB();

    const {
      email,
      otp,
    } = await req.json();

    if (!email || !otp) {

      return NextResponse.json({
        success: false,
        message: "Email and OTP are required",
      });

    }

    const record = await LoginOtp.findOne({

      email: email.toLowerCase().trim(),

    });

    if (!record) {

      return NextResponse.json({

        success: false,

        message: "OTP Not Found",

      });

    }

    if (record.attempts >= MAX_ATTEMPTS) {

      await LoginOtp.deleteOne({
        email,
      });

      return NextResponse.json({

        success: false,

        message:
          "Maximum attempts exceeded. Please login again.",

      });

    }

    if (new Date() > record.expiresAt) {

      await LoginOtp.deleteOne({
        email,
      });

      return NextResponse.json({

        success: false,

        message: "OTP Expired",

      });

    }

    if (record.otp !== otp) {

      record.attempts += 1;

      await record.save();

      return NextResponse.json({

        success: false,

        message: "Invalid OTP",

      });

    }

    // OTP Verified

    await LoginOtp.deleteOne({
      email,
    });

    const user = await User.findOne({

      email,

    });

    if (!user) {

      return NextResponse.json({

        success: false,

        message: "User not found",

      });

    }

    const token = jwt.sign(

      {

        id: user._id,

        tenantId: user.tenantId,

        roleId: user.roleId,

        companyId: user.companyId,

      },

      process.env.JWT_SECRET as string,

      {

        expiresIn: "7d",

      }

    );

    const response = NextResponse.json({

      success: true,

      message: "Login Successful",

      user: {

        id: user._id,

        tenantId: user.tenantId,

        companyId: user.companyId,

        roleId: user.roleId,

        name: user.name,

        email: user.email,

      },

    });

    response.cookies.set(

      "token",

      token,

      {

        httpOnly: true,

        secure: false,

        sameSite: "lax",

        path: "/",

        maxAge: 60 * 60 * 24 * 7,

      }

    );

    return response;

  }

  catch (err: any) {

    console.log(err);

    return NextResponse.json({

      success: false,

      message: err.message || "Verification Failed",

    });

  }

}