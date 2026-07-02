import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";


import "@/models/Role";
import "@/models/CompanyMaster";



export async function GET() {
  try {
    await connectDB();

    const users = await User.find()
      .populate("companyId", "companyName")
      .populate("roleId", "roleName")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      users,
    });

  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );

  }
}

export async function POST(
  req: NextRequest
) {

  try {

    await connectDB();

    const body =
      await req.json();

    const {

      employeeCode,

      name,

      email,

      password,

      mobile,

      companyId,

      roleId,

      department,

      designation,

      gender,

      dob,

      joiningDate,

      address,

      city,

      state,

      country,

      pincode,

      profilePhoto,

      status,

    } = body;

    // Duplicate Email Check

    const existing =
      await User.findOne({
        email,
      });

    if (existing) {

      return NextResponse.json(
        {
          error:
            "Email already exists.",
        },
        {
          status: 400,
        }
      );

    }

    // Password Hash

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const user =
      await User.create({

        tenantId:
          "TENANT001",

        employeeCode,

        name,

        email,

        password:
          hashedPassword,

        mobile,

        companyId,

        roleId,

        department,

        designation,

        gender,

        dob,

        joiningDate,

        address,

        city,

        state,

        country,

        pincode,

        profilePhoto,

        status,

      });

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );

  }

}