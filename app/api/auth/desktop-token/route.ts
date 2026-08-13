import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { SESSION_DURATION_JWT } from "@/lib/constants/session.constant";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const token = jwt.sign(
      {
        id: user._id,
        tenantId: user.tenantId || "TENANT001",
        roleId: user.roleId || null,
        companyId: user.companyId || null,
        isDesktopSso: true,
      },
      process.env.JWT_SECRET || "MabsolCRM@2026SecretKey",
      { expiresIn: SESSION_DURATION_JWT }
    );

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to generate desktop token" },
      { status: 500 }
    );
  }
}
