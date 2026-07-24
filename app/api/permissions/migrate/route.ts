import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Permission from "@/models/Permission";

export async function GET() {
  await connectDB();

  // Seed or update vfp.view permission
  await Permission.updateOne(
    { permissionKey: "vfp.view" },
    { $set: { moduleName: "Mabsol CRM Sync", permissionName: "View Sync Console", status: "active" } },
    { upsert: true }
  );

  // Seed or update vfp.settings permission
  await Permission.updateOne(
    { permissionKey: "vfp.settings" },
    { $set: { moduleName: "Mabsol CRM Sync", permissionName: "Sync Settings", status: "active" } },
    { upsert: true }
  );

  const permissions = await Permission.find();

  for (const item of permissions) {
    if (!item.permissionKey) {
      const module = item.moduleName.toLowerCase().replace(/\s+/g, "");
      let action = "";
      const text = item.permissionName.toLowerCase();

      if (text.includes("view")) action = "view";
      else if (text.includes("create")) action = "create";
      else if (text.includes("add")) action = "create";
      else if (text.includes("edit")) action = "edit";
      else if (text.includes("update")) action = "edit";
      else if (text.includes("delete")) action = "delete";
      else if (text.includes("export")) action = "export";
      else if (text.includes("print")) action = "print";
      else action = text.replace(/\s+/g, "");

      item.permissionKey = `${module}.${action}`;
      await item.save();
    }
  }

  return NextResponse.json({
    success: true,
    message: "Migration Completed",
  });
}