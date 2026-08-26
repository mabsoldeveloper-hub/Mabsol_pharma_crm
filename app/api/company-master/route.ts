import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_TYPE } from "@/lib/constants/roles.constant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = user.roleType === ROLE_TYPE.SUPER_ADMIN;
    const isAdmin = user.roleType === ROLE_TYPE.ADMIN;

    // SuperAdmin: can see all companies across tenants
    // Admin: can see all companies in their own tenant
    // All others: see ONLY their own company
    let query: Record<string, any> = {};

    if (isSuperAdmin) {
      // No filter — sees everything
      query = {};
    } else if (isAdmin && user.tenantId) {
      // Scoped strictly to this tenant only
      query.tenantId = user.tenantId;
    } else if (user.tenantId) {
      // Regular user — scoped to own tenant
      query.tenantId = user.tenantId;
    } else if (user.companyId) {
      // Fallback: scope by own companyId
      const compId = typeof user.companyId === "object" ? user.companyId._id : user.companyId;
      query._id = compId;
    } else {
      // Safety: never return all records — return empty
      return NextResponse.json([]);
    }

    const companies = await Company.find(query).sort({ createdAt: -1 });
    return NextResponse.json(companies);
  } catch (error: any) {
    console.error("Company Master GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // CRITICAL: always use the logged-in user's tenantId — never trust client-sent tenantId
    const targetTenantId = user.tenantId || `TENANT_${user._id}`;

    // Validate company name
    if (!data.companyName?.trim()) {
      return NextResponse.json({ success: false, error: "Company name is required" }, { status: 400 });
    }

    const company = await Company.create({
      tenantId: targetTenantId,
      companyCode: data.companyCode,
      companyName: data.companyName.trim(),
      ownerName: data.ownerName || user.name || "",
      email: data.email?.toLowerCase?.().trim() || user.email || "",
      mobile: data.mobile?.replace(/\D/g, "") || "",
      website: data.website || "",
      gstNo: String(data.gstNo || "").trim().toUpperCase(),
      panNo: data.panNo || "",
      drugLicenseNo: data.drugLicenseNo || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      invoicePrefix: data.invoicePrefix || "INV-001",
      purchasePrefix: data.purchasePrefix || "PUR-001",
      currency: data.currency || "INR",
      logo: data.logo || "",
      enabledModules: Array.isArray(data.enabledModules) ? data.enabledModules : [],
      status: data.status || "Active",
      createdBy: user._id || null,
    });

    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Company Create Error =>", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}