import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import SalesHierarchy from "@/models/SalesHierarchy";
import bcrypt from "bcryptjs";


import "@/models/Role";
import "@/models/CompanyMaster";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const users = await User.find()
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

    const user =
      await User.create({

        tenantId:
          "TENANT001",

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
