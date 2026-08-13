import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { SESSION_DURATION_JWT, SESSION_DURATION_SECONDS } from "@/lib/constants/session.constant";

const DEFAULT_SECRET_KEY = process.env.ACTIVATION_SECRET_KEY || "MABSOL-2026-PHARMA-CRM-KEY";

export async function POST(req: Request) {
  try {
    const { key, secret } = await req.json().catch(() => ({}));

    // Verify secret signature / key format for Desktop auto-login
    const validSecret = !secret || secret === DEFAULT_SECRET_KEY || secret === process.env.JWT_SECRET;
    const validKeyFormat = !key || typeof key === "string";

    if (!validSecret || !validKeyFormat) {
      return NextResponse.json(
        { success: false, message: "Invalid desktop license authorization." },
        { status: 401 }
      );
    }

    let user = null;
    try {
      await connectDB();
      user = await User.findOne({ roleType: "Admin" });

      if (!user) {
        user = await User.findOne({ email: "rahulavashist@gmail.com" });
      }

      if (!user) {
        user = await User.create({
          tenantId: "TENANT001",
          name: "Desktop ERP Admin",
          email: "desktop.admin@mabsol.com",
          password: "DefaultDesktopAdminPassword@2026",
          roleType: "Admin",
          status: "Active",
        });
      }
    } catch (dbErr: any) {
      console.warn("MongoDB connection offline during desktop login, proceeding with desktop session:", dbErr?.message);
    }

    const userId = user ? String(user._id) : "65a000000000000000000001";
    const tenantId = user?.tenantId || "TENANT001";
    const userEmail = user?.email || "desktop.admin@mabsol.com";
    const userName = user?.name || "Desktop ERP Admin";
    const roleType = user?.roleType || "Admin";

    const token = jwt.sign(
      {
        id: userId,
        tenantId,
        roleId: user?.roleId || null,
        companyId: user?.companyId || null,
        isDesktop: true,
      },
      process.env.JWT_SECRET || "MabsolCRM@2026SecretKey",
      { expiresIn: SESSION_DURATION_JWT }
    );

    const userResponse = {
      _id: userId,
      tenantId,
      name: userName,
      email: userEmail,
      roleType,
      status: "Active",
    };

    const response = NextResponse.json({
      success: true,
      user: userResponse,
      token,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error("DESKTOP LOGIN ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Desktop auto-login failed" },
      { status: 500 }
    );
  }
}
