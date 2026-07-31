import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import AiCallLog from "@/models/AiCallLog";
import User from "@/models/User";
import { initiateTwilioOutboundCall } from "@/lib/aws/aiVoiceService";

async function connectDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI as string);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const body = await req.json();
    const {
      partyName,
      partyType = "Contact",
      phoneNumber,
      callMode = "AI_TALK",
      ownerPhoneNumber = "",
      callObjective = "General CRM Follow-up",
      customNotes = "",
      userId,
      companyOwnerEmail,
    } = body;

    if (!partyName || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Contact Name and Phone Number are required." },
        { status: 400 }
      );
    }

    let targetOwnerEmail = companyOwnerEmail || process.env.COMPANY_OWNER_EMAIL || process.env.SMTP_USER;
    let initiatorName = "Admin / Owner";

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const userObj = await User.findById(userId).select("name email roleType");
      if (userObj) {
        initiatorName = userObj.name;
      }
    }

    if (!targetOwnerEmail) {
      const adminUser = await User.findOne({ roleType: "Admin" }).select("email");
      targetOwnerEmail = adminUser?.email || "rahulavashist@gmail.com";
    }

    // 1. Create Initial Call Log Entry in DB
    const callLogDoc = await AiCallLog.create({
      tenantId: "TENANT001",
      initiatedBy: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(),
      userName: initiatorName,
      partyType: partyType.trim(),
      partyName: partyName.trim(),
      phoneNumber: phoneNumber.trim(),
      callObjective: `${callMode === "BRIDGE_TALK" ? "[2-Way Agent Bridge] " : "[2-Way Interactive AI] "}${callObjective.trim()}`,
      callStatus: "IN_PROGRESS",
      ownerEmail: targetOwnerEmail,
    });

    // 2. Initiate Real 2-Way Outbound Call via Twilio Voice API
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const callbackUrl = `${protocol}://${host}/api/ai-calling/twilio-status`;

    const callRes = await initiateTwilioOutboundCall({
      partyName: partyName.trim(),
      phoneNumber: phoneNumber.trim(),
      callMode,
      ownerPhoneNumber: ownerPhoneNumber.trim(),
      callObjective: callObjective.trim(),
      callbackUrl,
    });

    callLogDoc.awsMetadata = {
      transcribeJobName: callRes.callSid || `call-${Date.now()}`,
      s3BucketKey: "",
      bedrockModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    };
    await callLogDoc.save();

    return NextResponse.json({
      success: true,
      message: `2-Way call initiated to ${phoneNumber}! Audio recording & transcript will be processed via AWS Transcribe and emailed to ${targetOwnerEmail} upon call completion.`,
      callSid: callRes.callSid,
      callLog: callLogDoc,
    });
  } catch (error: any) {
    console.error("AI Call Trigger Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to trigger 2-way call" },
      { status: 500 }
    );
  }
}
