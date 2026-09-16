import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import SalesHierarchy from "@/models/SalesHierarchy";
import bcrypt from "bcryptjs";


import "@/models/Role";
import Company from "@/models/Company";
import { getCurrentUser } from "@/lib/auth";
import { getHierarchyAccess } from "@/lib/hierarchyAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const access = await getHierarchyAccess(currentUser);

    if (!access.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Admin gets every active user in the tenant. Other roles get only their
    // own user plus the complete recursive reportsTo subtree.
    const userQuery: any = access.isAdmin
      ? { ...(currentUser?.tenantId ? { tenantId: currentUser.tenantId } : {}) }
      : { _id: { $in: access.accessibleUserIds.map(String) }, status: "Active" };

    const users = await User.find(userQuery)
      .populate("companyId", "companyName")
      .populate("roleId", "roleName")
      .sort({ createdAt: -1 })
      .lean();

    const hierarchies = await SalesHierarchy.find({
      userId: { $in: users.map((u: any) => u._id) },
      status: "Active",
    }).lean();

    const hierarchyMap = new Map<string, any>();
    hierarchies.forEach((h: any) => {
      if (h.userId) hierarchyMap.set(String(h.userId), h);
    });

    const childrenByParent = new Map<string, any[]>();
    users.forEach((u: any) => {
      if (!u.reportsTo) return;
      const parent = String(u.reportsTo);
      const arr = childrenByParent.get(parent) || [];
      arr.push(u);
      childrenByParent.set(parent, arr);
    });

    const enrichedUsers = users.map((u: any) => {
      const uid = String(u._id);
      const h = hierarchyMap.get(uid) || null;
      const directTeamCount = (childrenByParent.get(uid) || []).length;
      return {
        ...u,
        salesHierarchy: h,
        hierarchy: {
          reportsTo: u.reportsTo ? String(u.reportsTo) : null,
          reportsToName: h?.reportsToName || "",
          roleLevel: h?.roleLevel || u.roleType || "",
          directTeamCount,
          isInMyHierarchy: true,
        },
      };
    });

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      hierarchy: {
        currentUserId: access.userId,
        currentRole: access.role,
        isAdmin: access.isAdmin,
        totalAccessibleUsers: enrichedUsers.length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest
) {

  try {

    await connectDB();

    const body =
      await req.json();

    const {

      employeeCode,

      name,

      email,

      password,

      mobile,

      companyId,

      roleId,

      department,

      designation,

      gender,

      dob,

      joiningDate,

      address,

      city,

      state,

      country,

      pincode,

      profilePhoto,

      status,

    } = body;

    // Duplicate Email Check

    const existing =
      await User.findOne({
        email,
      });

    if (existing) {

      return NextResponse.json(
        {
          error:
            "Email already exists.",
        },
        {
          status: 400,
        }
      );

    }

    // Password Hash
    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    let targetTenantId = body.tenantId || "TENANT001";
    if (companyId) {
      const comp = await Company.findById(companyId);
      if (comp?.tenantId) {
        targetTenantId = comp.tenantId;
      }
    }

    const user =
      await User.create({
        tenantId: targetTenantId,

        employeeCode,

        name,

        email,

        password:
          hashedPassword,

        mobile,

        companyId,

        roleId,

        department,

        designation,

        gender,

        dob,

        joiningDate,

        address,

        city,

        state,

        country,

        pincode,

        profilePhoto,

        status,

      });

    // Automatically create SalesHierarchy record if salesHierarchyRole is provided
    if (body.salesHierarchyRole) {
      let reportsToName = "";
      if (body.salesHierarchyReportsTo) {
        const parentUser = await User.findById(body.salesHierarchyReportsTo);
        if (parentUser) reportsToName = parentUser.name;
      }

      await SalesHierarchy.create({
        userId: user._id,
        userName: user.name,
        employeeCode: user.employeeCode || "",
        roleLevel: body.salesHierarchyRole,
        state: (body.salesHierarchyState || "").trim(),
        region: (body.salesHierarchyRegion || "").trim(),
        reportsTo: body.salesHierarchyReportsTo || null,
        reportsToName,
        status: "Active",
      });
    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );

  }

}
