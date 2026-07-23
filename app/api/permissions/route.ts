import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Permission from "@/models/Permission";

export async function GET() {
  try {
    await connectDB();

    // Auto-seed or update vfp.view permission
    const vfpPermission = await Permission.findOne({ permissionKey: "vfp.view" });
    if (!vfpPermission) {
      await Permission.create({
        moduleName: "Mabsol CRM Sync",
        permissionName: "View Sync Console",
        permissionKey: "vfp.view",
        status: "active",
      });
    } else if (vfpPermission.moduleName === "VFP" || vfpPermission.permissionName.includes("VFP")) {
      vfpPermission.moduleName = "Mabsol CRM Sync";
      vfpPermission.permissionName = "View Sync Console";
      await vfpPermission.save();
    }

    // Auto-seed or update vfp.settings permission
    const vfpSettingsPermission = await Permission.findOne({ permissionKey: "vfp.settings" });
    if (!vfpSettingsPermission) {
      await Permission.create({
        moduleName: "Mabsol CRM Sync",
        permissionName: "Sync Settings",
        permissionKey: "vfp.settings",
        status: "active",
      });
    } else if (vfpSettingsPermission.moduleName === "VFP" || vfpSettingsPermission.permissionName.includes("VFP")) {
      vfpSettingsPermission.moduleName = "Mabsol CRM Sync";
      vfpSettingsPermission.permissionName = "Sync Settings";
      await vfpSettingsPermission.save();
    }

    const permissions = await Permission.find().sort({
      moduleName: 1,
      permissionName: 1,
    });

    return NextResponse.json(permissions);
  } catch {
    return NextResponse.json(
      {
        error: "Failed to load permissions",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { moduleName, permissionName, permissionKey, status } = await req.json();

    // Duplicate Check
    const exists = await Permission.findOne({
      permissionKey,
    });

    if (exists) {
      return NextResponse.json(
        {
          error: "Permission Key already exists.",
        },
        {
          status: 400,
        }
      );
    }

    // Save
    const permission = await Permission.create({
      moduleName,
      permissionName,
      permissionKey,
      status,
    });

    return NextResponse.json({
      success: true,
      permission,
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