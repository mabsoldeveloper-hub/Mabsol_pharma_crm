import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";

import User from "@/models/User";
import Otp from "@/models/Otp";

export async function POST(req: Request) {
  try {
    await connectDB();

    const {
      name,
      email,
      mobile,
      password,
      role,
    } = await req.json();

    if (!name || !email || !mobile || !password) {
      return NextResponse.json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check existing email
    const emailExists = await User.findOne({
      email,
    });

    if (emailExists) {
      return NextResponse.json({
        success: false,
        message: "Email already exists",
      });
    }

    // Check existing mobile
    const mobileExists = await User.findOne({
      mobile,
    });

    if (mobileExists) {
      return NextResponse.json({
        success: false,
        message: "Mobile already exists",
      });
    }

    // Email OTP verified?
    const emailOtp = await Otp.findOne({
      email,
      type: "email",
      verified: true,
    });

    if (!emailOtp) {
      return NextResponse.json({
        success: false,
        message: "Email is not verified",
      });
    }

    // Mobile OTP verified?
    const mobileOtp = await Otp.findOne({
      mobile,
      type: "mobile",
      verified: true,
    });

    if (!mobileOtp) {
      return NextResponse.json({
        success: false,
        message: "Mobile is not verified",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      tenantId: "TENANT001",

      name,

      email,

      mobile,

      password: hashedPassword,

      role: role || "Employee",

      status: "Active",

      mobileVerified: true,
    });

    // Delete OTPs after successful registration
    await Otp.deleteMany({
      $or: [
        {
          email,
          type: "email",
        },
        {
          mobile,
          type: "mobile",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Registration Successful",
      user,
    });

  } catch (error) {
    console.log(error);

    return NextResponse.json({
      success: false,
      message: "Registration Failed",
    });
  }
}