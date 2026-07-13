import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const {
      name,
      email,
      password,
      role,
    } = await req.json();

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

      const user = await User.create({
        tenantId: "TENANT001",
        name,
        email,
        password: hashedPassword,
        role: role || "Employee",
        status: "Active",
      });

    return NextResponse.json({
      success: true,
      message: "User Registered Successfully",
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


