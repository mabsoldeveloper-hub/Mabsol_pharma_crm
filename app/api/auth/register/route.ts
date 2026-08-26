import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";
import Role from "@/models/Role";
import Otp from "@/models/Otp";
import { extractPanFromGstin, extractStateCodeFromGstin, getStateNameFromCode } from "@/lib/gstHelper";
import {
  validateName,
  validateEmail,
  validateMobile,
  validatePassword,
} from "@/lib/constants/validation.constant";
import { ROLE_TYPE } from "@/lib/constants/roles.constant";

/**
 * Generate a unique tenant ID for multi-tenant data isolation.
 * Ensures each registered pharma firm has an isolated workspace.
 */
async function generateUniqueTenantId(): Promise<string> {
  const count = await Company.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, "0");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  let candidate = `TENANT_${nextNum}_${randomSuffix}`;

  let exists = await Company.findOne({ tenantId: candidate });
  while (exists) {
    const extraRand = Math.random().toString(36).substring(2, 6).toUpperCase();
    candidate = `TENANT_${nextNum}_${extraRand}`;
    exists = await Company.findOne({ tenantId: candidate });
  }
  return candidate;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      name,
      email,
      mobile,
      password,
      designation,
      // Company & GST details
      companyName,
      gstNo,
      panNo,
      drugLicenseNo,
      address,
      city,
      state,
      pincode,
      additionalGstins,
      businessType,
      financialYearName,
    } = body;

    // ── Field Validation ─────────────────────────────────────────────────────
    const nameErr = validateName(name || "");
    if (nameErr) return NextResponse.json({ success: false, message: nameErr }, { status: 400 });

    const emailErr = validateEmail(email || "");
    if (emailErr) return NextResponse.json({ success: false, message: emailErr }, { status: 400 });

    const mobileErr = validateMobile(mobile || "");
    if (mobileErr) return NextResponse.json({ success: false, message: mobileErr }, { status: 400 });

    const passwordErr = validatePassword(password || "");
    if (passwordErr) return NextResponse.json({ success: false, message: passwordErr }, { status: 400 });

    if (!companyName?.trim()) {
      return NextResponse.json({ success: false, message: "Company name is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanMobile = mobile.replace(/\D/g, "");

    // ── Duplicate Checks ──────────────────────────────────────────────────────
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return NextResponse.json({
        success: false,
        message: "This email address is already registered. Please use a different email or sign in.",
      }, { status: 409 });
    }

    const mobileExists = await User.findOne({ mobile: cleanMobile });
    if (mobileExists) {
      return NextResponse.json({
        success: false,
        message: "This mobile number is already registered. Please use a different number or sign in.",
      }, { status: 409 });
    }

    // ── OTP Verification ──────────────────────────────────────────────────────
    const emailOtp = await Otp.findOne({
      email: cleanEmail,
      type: "email",
      verified: true,
    });

    if (!emailOtp) {
      return NextResponse.json({
        success: false,
        message: "Email OTP verification is required before registration. Please verify your email.",
      }, { status: 400 });
    }

    const mobileOtp = await Otp.findOne({
      mobile: cleanMobile,
      type: "mobile",
      verified: true,
    });

    if (!mobileOtp) {
      return NextResponse.json({
        success: false,
        message: "Mobile OTP verification is required before registration. Please verify your mobile number.",
      }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Company & Tenant Setup ────────────────────────────────────────────────
    const tenantId = await generateUniqueTenantId();
    const finalCompanyName = companyName.trim();
    const cleanGstNo = String(gstNo || "").trim().toUpperCase();
    const derivedPan = panNo || extractPanFromGstin(cleanGstNo) || "";
    const stateCode = extractStateCodeFromGstin(cleanGstNo);
    const finalState = state || getStateNameFromCode(stateCode) || "";

    // Generate unique company code: first 4 letters + 3-digit random
    const baseCode = finalCompanyName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "PHAR";
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const companyCode = `${baseCode}${randomSuffix}`;

    // Ensure company code is unique
    const codeExists = await Company.findOne({ companyCode });
    const finalCompanyCode = codeExists ? `${baseCode}${Math.floor(100 + Math.random() * 900)}` : companyCode;

    const formattedAdditionalGstins = Array.isArray(additionalGstins)
      ? additionalGstins.map((g: any) => ({
          gstNo: String(g.gstNo || "").trim().toUpperCase(),
          state: g.state || getStateNameFromCode(extractStateCodeFromGstin(g.gstNo || "")) || "",
          stateCode: g.stateCode || extractStateCodeFromGstin(g.gstNo || "") || "",
          verified: Boolean(g.verified),
          address: g.address || "",
          city: g.city || "",
          pincode: g.pincode || "",
        }))
      : [];

    // ── Create Company ────────────────────────────────────────────────────────
    const newCompany = await Company.create({
      tenantId,
      companyCode: finalCompanyCode,
      companyName: finalCompanyName,
      ownerName: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      gstNo: cleanGstNo,
      panNo: derivedPan,
      drugLicenseNo: drugLicenseNo || "",
      address: address || "",
      city: city || "",
      state: finalState,
      pincode: pincode || "",
      businessType: businessType || "pharma_enterprise",
      additionalGstins: formattedAdditionalGstins,
      enabledModules: [],
      status: "Active",
      isDefault: true,
    });

    // ── Create Default Financial Year ─────────────────────────────────────────
    const currentYear = new Date().getFullYear();
    const defaultFyName = financialYearName || `${currentYear}-${(currentYear + 1).toString().slice(2)}`;
    const startDate = new Date(`${currentYear}-04-01`);
    const endDate = new Date(`${currentYear + 1}-03-31`);

    await FinancialYear.create({
      tenantId,
      companyId: newCompany._id,
      fyCode: `${finalCompanyCode}_${defaultFyName.replace(/[^0-9]/g, "")}`,
      fyName: defaultFyName,
      startDate,
      endDate,
      isCurrent: true,
      status: "Active",
    });

    // ── Ensure Admin Role ─────────────────────────────────────────────────────
    let adminRole = await Role.findOne({ tenantId, roleName: ROLE_TYPE.ADMIN });
    if (!adminRole) {
      adminRole = await Role.create({
        tenantId,
        roleName: ROLE_TYPE.ADMIN,
        description: "Company Administrator with full system access",
        status: "Active",
      });
    }

    // ── Create Admin User ─────────────────────────────────────────────────────
    const user = await User.create({
      tenantId,
      companyId: newCompany._id,
      roleId: adminRole._id,
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password: hashedPassword,
      role: ROLE_TYPE.ADMIN,
      roleType: ROLE_TYPE.ADMIN,
      designation: designation || "Company Owner",
      status: "Active",
      mobileVerified: true,
    });

    // Link createdBy on company
    newCompany.createdBy = user._id;
    await newCompany.save();

    // ── Cleanup OTPs ──────────────────────────────────────────────────────────
    await Otp.deleteMany({
      $or: [
        { email: cleanEmail, type: "email" },
        { mobile: cleanMobile, type: "mobile" },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Pharma CRM Workspace & Account Created Successfully",
      tenantId,
      user: {
        _id: user._id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        roleType: user.roleType,
        companyId: newCompany._id,
        companyName: newCompany.companyName,
      },
      company: {
        _id: newCompany._id,
        tenantId: newCompany.tenantId,
        companyName: newCompany.companyName,
        companyCode: finalCompanyCode,
        gstNo: newCompany.gstNo,
      },
    });
  } catch (error: any) {
    console.error("[REGISTER ERROR]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Registration Failed. Please try again.",
      },
      { status: 500 }
    );
  }
}