import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import FormSubmission from "@/models/FormSubmission";
import FormTemplate from "@/models/FormTemplate";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const formId = searchParams.get("formId");
    if (!formId) {
      return NextResponse.json(
        { success: false, error: "formId search parameter is required" },
        { status: 400 }
      );
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const template = await FormTemplate.findOne({ formId }).lean();
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Form template not found" },
        { status: 404 }
      );
    }

    const query: any = { formId };

    if (status && status !== "All") query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Dynamic field filtering
    template.fields.forEach((field: any) => {
      const fieldVal = searchParams.get(field.key);
      if (fieldVal) {
        if (field.type === "number") {
          query[`data.${field.key}`] = Number(fieldVal);
        } else if (field.type === "select" || field.type === "radio") {
          query[`data.${field.key}`] = fieldVal;
        } else {
          query[`data.${field.key}`] = { $regex: fieldVal, $options: "i" };
        }
      }
    });

    if (search) {
      const searchOrs: any[] = [
        { "submittedBy.userName": { $regex: search, $options: "i" } },
        { "submittedBy.userEmail": { $regex: search, $options: "i" } },
      ];
      template.fields.forEach((f: any) => {
        if (f.type === "text" || f.type === "textarea" || f.type === "select" || f.type === "mappedTable") {
          searchOrs.push({ [`data.${f.key}`]: { $regex: search, $options: "i" } });
        }
      });
      query.$or = searchOrs;
    }

    const skip = (page - 1) * limit;
    const [submissions, total] = await Promise.all([
      FormSubmission.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FormSubmission.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      template,
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching form submissions:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { formId, data, submittedBy, remarks, pin } = body;

    if (!formId) {
      return NextResponse.json(
        { success: false, error: "formId is required" },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Submission data must be an object" },
        { status: 400 }
      );
    }

    const template = await FormTemplate.findOne({ formId });
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Form template not found" },
        { status: 404 }
      );
    }

    // Verify Password Pin if required
    if (template.accessMode === "PasswordProtected") {
      if (!pin || pin.trim() !== (template.accessPin || "").trim()) {
        return NextResponse.json(
          { success: false, error: "Invalid PIN code for this form." },
          { status: 401 }
        );
      }
    }

    // Validate required fields
    const missingFields: string[] = [];
    template.fields.forEach((field: any) => {
      if (field.required) {
        const val = data[field.key];
        if (val === undefined || val === null || val === "") {
          missingFields.push(field.label || field.key);
        }
      }
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Required fields missing: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const initialStatus = template.approvalWorkflow?.enabled ? "Under Review" : "Submitted";

    const submission = await FormSubmission.create({
      formId,
      formTitle: template.title,
      data,
      submittedBy: {
        userName: submittedBy?.userName || "Respondent",
        userEmail: submittedBy?.userEmail || "",
        roleType: submittedBy?.roleType || "User",
        isPublicRespondent: !!submittedBy?.isPublicRespondent,
      },
      remarks: remarks || "",
      status: initialStatus,
      approvalHistory: template.approvalWorkflow?.enabled
        ? [{ action: "Under Review", remarks: "Submission queued for manager review", at: new Date() }]
        : [],
    });

    // Auto Master Sync Engine
    if (template.autoMasterSync?.enabled && template.autoMasterSync?.targetModel) {
      try {
        const targetModel = template.autoMasterSync.targetModel;
        const mappedDoc: Record<string, any> = {};
        
        template.fields.forEach((f: any) => {
          if (f.mappedField && data[f.key] !== undefined) {
            mappedDoc[f.mappedField] = data[f.key];
          } else {
            mappedDoc[f.key] = data[f.key];
          }
        });

        mappedDoc.createdAt = new Date();
        mappedDoc.updatedAt = new Date();
        mappedDoc.sourceFormId = formId;

        const db = mongoose.connection.db;
        if (db) {
          const colName = targetModel.endsWith("s") ? targetModel : `${targetModel}s`;
          const syncRes = await db.collection(colName).insertOne(mappedDoc);
          
          submission.syncedToMaster = {
            synced: true,
            targetModel: colName,
            syncedRecordId: String(syncRes.insertedId),
            syncedAt: new Date(),
          };
          await submission.save();
        }
      } catch (syncErr) {
        console.error("Error in AutoMasterSyncEngine:", syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: template.approvalWorkflow?.enabled
        ? "Form entry submitted and queued for Manager Review"
        : "Form entry submitted successfully",
      submission,
    });
  } catch (error: any) {
    console.error("Error submitting form entry:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Manager Approval Action (Approve / Reject)
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { submissionId, action, remarks, managerName } = body;

    if (!submissionId || !action) {
      return NextResponse.json(
        { success: false, error: "submissionId and action (Approved/Rejected) are required" },
        { status: 400 }
      );
    }

    const submission = await FormSubmission.findById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission entry not found" },
        { status: 404 }
      );
    }

    submission.status = action;
    submission.approvalHistory.push({
      action,
      byUserName: managerName || "Manager",
      remarks: remarks || "",
      at: new Date(),
    });

    await submission.save();

    return NextResponse.json({
      success: true,
      message: `Submission entry successfully marked as ${action}`,
      submission,
    });
  } catch (error: any) {
    console.error("Error updating approval status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
