import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import AiCallLog from "@/models/AiCallLog";
import Notification from "@/models/Notification";
import {
  transcribeAudioWithAws,
  generateBedrockSummary,
} from "@/lib/aws/aiVoiceService";
import { sendCallTranscriptToOwner } from "@/lib/email/callTranscriptEmail";

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
      callLogId,
      callStatus = "COMPLETED",
      partyName,
      partyType = "Contact",
      phoneNumber,
      recordingUrl,
      rawTranscript,
      aiSummary,
      durationSeconds,
    } = body;

    let callLog;
    if (callLogId && mongoose.Types.ObjectId.isValid(callLogId)) {
      callLog = await AiCallLog.findById(callLogId);
    }

    if (!callLog && partyName && phoneNumber) {
      callLog = new AiCallLog({
        tenantId: "TENANT001",
        partyName,
        partyType,
        phoneNumber,
        initiatedBy: new mongoose.Types.ObjectId(),
        userName: "Automated Voice Bot",
      });
    }

    if (!callLog) {
      return NextResponse.json(
        { success: false, error: "Missing required call parameters" },
        { status: 400 }
      );
    }

    let finalTranscript = rawTranscript;
    let finalSummary = aiSummary;
    let finalDuration = durationSeconds || 120;

    if ((!finalTranscript || !finalSummary) && recordingUrl) {
      const transcribeRes = await transcribeAudioWithAws(
        recordingUrl,
        callLog.partyName
      );
      finalTranscript = transcribeRes.rawTranscript;
      finalDuration = transcribeRes.durationSeconds;

      finalSummary = await generateBedrockSummary(
        finalTranscript,
        callLog.partyName,
        callLog.partyType
      );
    }

    if (!finalTranscript) {
      finalTranscript = [
        {
          speaker: callLog.partyName,
          text: "Real voice call completed.",
          timestamp: "00:00",
        },
      ];
    }

    if (!finalSummary) {
      finalSummary = {
        overview: `Completed phone call with ${callLog.partyName}.`,
        keyPoints: [`Call completed with ${callLog.partyName}.`],
        actionItems: [`Follow up with ${callLog.partyName}.`],
        sentiment: "POSITIVE",
      };
    }

    callLog.callStatus = callStatus;
    callLog.callDurationSeconds = finalDuration;
    if (recordingUrl) callLog.recordingUrl = recordingUrl;
    callLog.rawTranscript = finalTranscript as any;
    callLog.aiSummary = finalSummary as any;

    const ownerEmail = callLog.ownerEmail || process.env.COMPANY_OWNER_EMAIL || process.env.SMTP_USER || "support@mabsolinfotech.com";

    const emailRes = await sendCallTranscriptToOwner({
      ownerEmail,
      partyName: callLog.partyName,
      partyType: callLog.partyType,
      phoneNumber: callLog.phoneNumber,
      callDurationSeconds: finalDuration,
      initiatedByName: callLog.userName,
      createdAt: callLog.createdAt || new Date(),
      aiSummary: finalSummary,
      rawTranscript: finalTranscript,
      callLogId: callLog._id.toString(),
    });

    if (emailRes.success) {
      callLog.ownerNotified = true;
      callLog.notifiedAt = new Date();
    }

    await callLog.save();

    // Create Notification
    await Notification.create({
      tenantId: "TENANT001",
      title: `📞 Real Call Webhook: ${callLog.partyName}`,
      message: `Call completed. Sentiment: ${finalSummary.sentiment}. Overview: ${finalSummary.overview.slice(0, 100)}...`,
      type: "AI_CALL_COMPLETED",
      category: "SYSTEM",
      severity: "info",
      targetRole: "Admin",
      entityId: callLog._id.toString(),
      actionUrl: `/dashboard/ai-calling?logId=${callLog._id}`,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed and call transcript emailed to owner",
      logId: callLog._id,
    });
  } catch (error: any) {
    console.error("AI Call Webhook Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
