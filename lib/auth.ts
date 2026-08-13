import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Role";
import "@/models/CompanyMaster";

export async function verifyToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    return jwt.verify(
      token,
      process.env.JWT_SECRET || "MabsolCRM@2026SecretKey"
    );
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const payload = await verifyToken();
  if (!payload) return null;

  const isDesktop = (payload as any).isDesktop || (payload as any).isDesktopSso;

  try {
    await connectDB();
    const user = await User.findById((payload as any).id)
      .populate("companyId", "companyName logo")
      .populate("roleId", "roleName");

    if (user) return user;
  } catch (dbErr: any) {
    console.warn("Database lookup error in getCurrentUser:", dbErr?.message);
  }

  // If token is desktop session token, return Desktop Admin user object fallback
  if (isDesktop) {
    return {
      _id: (payload as any).id || "65a000000000000000000001",
      name: "Desktop ERP Admin",
      email: "desktop.admin@mabsol.com",
      roleType: "Admin",
      tenantId: (payload as any).tenantId || "TENANT001",
      status: "Active",
    };
  }

  return null;
}