import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import "@/models/User";
import "@/models/AreaMaster";
import "@/models/Company";

export const dynamic = "force-dynamic";

import mongoose from "mongoose";

function toObjId(id: any) {
  if (!id) return null;
  const str = String(id?._id || id).trim();
  return /^[0-9a-fA-F]{24}$/.test(str) ? new mongoose.Types.ObjectId(str) : str;
}

// ─── GET: List all leads with filtering, pagination, search ──────────────────
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filters
    const stage = searchParams.get("stage");
    const leadType = searchParams.get("leadType");
    const priority = searchParams.get("priority");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const isConverted = searchParams.get("isConverted");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const userCompanyId = user.companyId?._id || user.companyId;
    const reqCompanyId = searchParams.get("companyId");
    const reqFyId = searchParams.get("fyId");

    const andConditions: any[] = [];

    // Company Scoping
    const companyOr: any[] = [{ companyId: null }, { companyId: { $exists: false } }];
    if (userCompanyId) companyOr.push({ companyId: toObjId(userCompanyId) });
    if (reqCompanyId && String(reqCompanyId) !== String(userCompanyId)) {
      companyOr.push({ companyId: toObjId(reqCompanyId) });
    }
    andConditions.push({ $or: companyOr });

    // Financial Year Scoping
    if (reqFyId && reqFyId !== "ALL") {
      andConditions.push({
        $or: [{ fyId: toObjId(reqFyId) }, { fyId: null }, { fyId: { $exists: false } }],
      });
    }

    // Filters
    if (stage && stage !== "All" && stage !== "All Stages") andConditions.push({ stage });
    if (leadType && leadType !== "All" && leadType !== "All Types") andConditions.push({ leadType });
    if (priority && priority !== "All" && priority !== "All Priorities") andConditions.push({ priority });
    if (source && source !== "All" && source !== "All Sources") andConditions.push({ source });
    if (assignedTo) andConditions.push({ assignedTo: toObjId(assignedTo) });
    if (isConverted !== null && isConverted !== undefined)
      andConditions.push({ isConverted: isConverted === "true" });

    // Search
    if (search) {
      andConditions.push({
        $or: [
          { partyName: { $regex: search, $options: "i" } },
          { contactPerson: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { leadNumber: { $regex: search, $options: "i" } },
          { city: { $regex: search, $options: "i" } },
          { gstin: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Date Range
    if (dateFrom || dateTo) {
      const dateCond: any = {};
      if (dateFrom) dateCond.$gte = new Date(dateFrom);
      if (dateTo) dateCond.$lte = new Date(dateTo + "T23:59:59.999Z");
      andConditions.push({ createdAt: dateCond });
    }

    const filter = { $and: andConditions };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate("assignedTo", "name email mobile roleType")
        .populate("areaId", "areaName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("[LEADS GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Create a new lead ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Duplicate check by phone within same company
    if (body.phone) {
      const existing = await Lead.findOne({
        companyId: user.companyId,
        phone: body.phone.trim(),
      });
      if (existing) {
        return NextResponse.json(
          {
            error: "Duplicate",
            message: `A lead with this phone number already exists: ${existing.partyName} (${existing.leadNumber})`,
            existingLead: { _id: existing._id, partyName: existing.partyName, leadNumber: existing.leadNumber },
          },
          { status: 409 }
        );
      }
    }

    // ─── Generate lead number safely in API (avoids pre-save hook issues) ───
    let leadNumber = "";
    try {
      const mongoose = (await import("mongoose")).default;
      const db = mongoose.connection.db;
      if (db) {
        const result = await db.collection("leadcounters").findOneAndUpdate(
          { name: "lead" },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: "after" }
        );
        const seq = (result as any)?.seq ?? (result as any)?.value?.seq ?? 1;
        const year = new Date().getFullYear();
        leadNumber = `LD-${year}-${String(seq).padStart(4, "0")}`;
      }
    } catch (counterErr) {
      console.warn("Lead number generation skipped:", counterErr);
    }

    // Create the lead
    const lead = await Lead.create({
      ...body,
      leadNumber: leadNumber || undefined,
      companyId: body.companyId || user.companyId?._id || user.companyId,
      fyId: body.fyId || null,
      fyCode: body.fyCode || "",
      tenantId: user.tenantId || "TENANT001",
      assignedTo: body.assignedTo || user._id,
      assignedToName: body.assignedToName || user.name,
      assignedAt: new Date(),
    });

    // Log creation activity
    await LeadActivity.create({
      leadId: lead._id,
      userId: user._id,
      userName: user.name,
      type: "System",
      summary: `Lead created by ${user.name} from source: ${lead.source || "Manual"}`,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error: any) {
    console.error("[LEADS POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
