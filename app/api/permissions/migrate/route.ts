import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Permission from "@/models/Permission";

export async function GET() {

  await connectDB();

  // Seed vfp.view permission if it doesn't exist
  const vfpPermission = await Permission.findOne({ permissionKey: "vfp.view" });
  if (!vfpPermission) {
    await Permission.create({
      moduleName: "VFP",
      permissionName: "View VFP Sync",
      permissionKey: "vfp.view",
      status: "active",
    });
  }

  const permissions =
    await Permission.find();

  for (const item of permissions) {

    if (!item.permissionKey) {

      const module =
        item.moduleName
          .toLowerCase()
          .replace(/\s+/g, "");

      let action = "";

      const text =
        item.permissionName.toLowerCase();

      if (text.includes("view"))
        action = "view";

      else if (text.includes("create"))
        action = "create";

      else if (text.includes("add"))
        action = "create";

      else if (text.includes("edit"))
        action = "edit";

      else if (text.includes("update"))
        action = "edit";

      else if (text.includes("delete"))
        action = "delete";

      else if (text.includes("export"))
        action = "export";

      else if (text.includes("print"))
        action = "print";

      else
        action =
          text.replace(/\s+/g, "");

      item.permissionKey =
        `${module}.${action}`;

      await item.save();

    }

  }

  return NextResponse.json({

    success: true,

    message:
      "Migration Completed",

  });

}