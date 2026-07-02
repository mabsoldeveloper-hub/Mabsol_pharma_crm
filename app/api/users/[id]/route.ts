import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// ======================
// GET SINGLE USER
// ======================

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {

    await connectDB();

    const { id } = await params;

    const user =
      await User.findById(id)
        .populate(
          "companyId",
          "companyName"
        )
        .populate(
          "roleId",
          "roleName"
        );

    if (!user) {

      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );

    }

    return NextResponse.json(user);

  } catch (error: any) {

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );

  }
}

// ======================
// UPDATE USER
// ======================

export async function PUT(
  req: NextRequest,
  { params }: Props
) {

  try {

    await connectDB();

    const { id } = await params;

    const body =
      await req.json();

    // Password aaye to hash karo

    if (
      body.password &&
      body.password.trim() !== ""
    ) {

      body.password =
        await bcrypt.hash(
          body.password,
          10
        );

    } else {

      delete body.password;

    }

    const user =
      await User.findByIdAndUpdate(

        id,

        body,

        {
          new: true,
        }

      );

    return NextResponse.json({

      success: true,

      user,

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

// ======================
// DELETE USER
// ======================

export async function DELETE(
  req: NextRequest,
  { params }: Props
) {

  try {

    await connectDB();

    const { id } =
      await params;

    await User.findByIdAndDelete(
      id
    );

    return NextResponse.json({

      success: true,

      message:
        "User Deleted",

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