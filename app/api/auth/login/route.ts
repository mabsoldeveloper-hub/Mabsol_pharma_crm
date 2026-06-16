import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return NextResponse.json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        tenantId: user.tenantId,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    const userResponse = {
      _id: user._id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const response = NextResponse.json({
      success: true,
      user: userResponse,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}