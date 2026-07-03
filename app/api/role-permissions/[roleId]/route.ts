import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RolePermission from "@/models/RolePermission";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {

  await connectDB();

  const { roleId } = await params;

  const data = await RolePermission
    .find({
      roleId,
    })
    .populate("permissionId");

  return NextResponse.json(data);
}