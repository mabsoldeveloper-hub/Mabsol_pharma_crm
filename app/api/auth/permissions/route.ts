import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import { getCurrentUser } from "@/lib/auth";

import RolePermission from "@/models/RolePermission";
import UserPermission from "@/models/UserPermission";

import "@/models/Permission";

export async function GET() {

  try {

    await connectDB();

    const user =
      await getCurrentUser();

    if (!user) {

      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 401,
        }
      );

    }

    // -----------------------
    // Role Permissions
    // -----------------------

    const rolePermissions =
      await RolePermission.find({

        roleId:
          user.roleId,

        allow: true,

      }).populate(
        "permissionId"
      );

    // -----------------------
    // User Permissions
    // -----------------------

    const userPermissions =
      await UserPermission.find({

        userId:
          user._id,

        allow: true,

      }).populate(
        "permissionId"
      );

    // -----------------------
    // Merge
    // -----------------------

    const finalPermissions =
      new Set<string>();

    rolePermissions.forEach((item: any) => {
      if (item.permissionId) {
        finalPermissions.add(item.permissionId.permissionKey);
      } else {
        console.log("Invalid Role Permission:", item);
      }
    });

    userPermissions.forEach((item: any) => {
      if (item.permissionId) {
        finalPermissions.add(item.permissionId.permissionKey);
      } else {
        console.log("Invalid User Permission:", item);
      }
    });

    return NextResponse.json({

      success: true,

      permissions:
        [...finalPermissions],

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