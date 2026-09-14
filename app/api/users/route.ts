import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import SalesHierarchy from "@/models/SalesHierarchy";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import "@/models/Role";
import Company from "@/models/Company";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();

    let query: any = {};
    if (currentUser?.tenantId) {
      query.tenantId = currentUser.tenantId;
    } else if (currentUser?.companyId) {
      query.companyId = currentUser.companyId;
    }

    const users = await User.find(query)
      .populate("companyId", "companyName")
      .populate("roleId", "roleName")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch all active Sales Hierarchy records
    const hierarchies = await SalesHierarchy.find({ status: "Active" }).lean();
    const hierarchyMap = new Map<string, any>();
    hierarchies.forEach((h: any) => {
      if (h.userId) {
        hierarchyMap.set(String(h.userId).trim(), h);
      }
    });

    // Enrich users with salesHierarchy details
    const enrichedUsers = users.map((u: any) => {
      const uid = String(u._id).trim();
      const h = hierarchyMap.get(uid);
      return {
        ...u,
        salesHierarchy: h || null,
      };
    });

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
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

    // Duplicate Email & Mobile Checks
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, "") : "";

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return NextResponse.json(
        {
          error: "An account with this email address already exists.",
        },
        {
          status: 400,
        }
      );
    }

    if (cleanMobile) {
      const existingMobile = await User.findOne({ mobile: cleanMobile });
      if (existingMobile) {
        return NextResponse.json(
          {
            error: "An account with this mobile number already exists.",
          },
          {
            status: 400,
          }
        );
      }
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

/**
 * Generate a unique employee code based on user's name + random number
 */
async function generateUniqueEmployeeCode(userName: string): Promise<string> {
  const cleaned = (userName || "").trim().replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = cleaned.length >= 3 ? cleaned.slice(0, 5) : (cleaned || "EMP");

  let isUnique = false;
  let code = "";

  while (!isUnique) {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    code = `${prefix}-${randNum}`;

    const existing = await User.findOne({ employeeCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}

    let roleName = body.roleName || "";
    let roleType = body.roleType || "MR";
    let dashboardType = body.dashboardType || "salesman";

    if (roleId) {
      const roleDoc: any = await mongoose.model("Role").findById(roleId).lean();
      if (roleDoc) {
        roleName = roleDoc.roleName;
        roleType = roleDoc.roleName;
        dashboardType = roleDoc.dashboardType || (roleDoc.roleName.toLowerCase().includes("admin") ? "admin" : roleDoc.roleName.toLowerCase().includes("manager") ? "manager" : "salesman");
      }
    }

    const finalEmployeeCode = employeeCode && employeeCode.trim() 
      ? employeeCode.trim() 
      : await generateUniqueEmployeeCode(name || "EMP");

    const user =
      await User.create({
        tenantId: targetTenantId,
        employeeCode: finalEmployeeCode,
        name,
        email,
        password: hashedPassword,
        mobile,
        companyId: companyId || null,
        roleId: roleId || null,
        roleName,
        roleType,
        dashboardType,
        assignedAreaIds: Array.isArray(body.assignedAreaIds) ? body.assignedAreaIds : body.assignedAreaId ? [body.assignedAreaId] : [],
        assignedAreaNames: Array.isArray(body.assignedAreaNames) ? body.assignedAreaNames : body.assignedAreaName ? [body.assignedAreaName] : [],
        ...(department ? { department } : {}),
        designation: designation || "",
        ...(gender ? { gender } : {}),
        ...(body.gstNo ? { gstNo: body.gstNo } : {}),
        dob,
        joiningDate,
        address: address || "",
        city: city || "",
        state: state || "",
        country: country || "India",
        pincode: pincode || "",
        profilePhoto: profilePhoto || "",
        status: status || "Active",
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
