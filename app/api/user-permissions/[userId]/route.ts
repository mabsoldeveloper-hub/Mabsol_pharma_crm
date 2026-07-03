import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import UserPermission from "@/models/UserPermission";

interface Props {
  params: Promise<{
    userId: string;
  }>;
}

export async function GET(
  req: NextRequest,
  { params }: Props
) {

  try {

    await connectDB();

    const { userId } =
      await params;

    const permissions =
      await UserPermission.find({
        userId,
      });

    return NextResponse.json(
      permissions
    );

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