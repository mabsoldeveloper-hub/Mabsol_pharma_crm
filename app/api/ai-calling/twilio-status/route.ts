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

    // Twilio sends urlencoded form data or JSON callback
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((val, key) => {
        body[key] = val;
      });
    } else {
      body = await req.json();
    }

    const {
      CallSid,
      CallStatus,
      RecordingUrl,
      RecordingDuration,
      To,
      From,
    } = body;

    console.log(`Twilio Callback Event Received. CallSid: ${CallSid}, Status: ${CallStatus}, Recording: ${RecordingUrl}`);

    let callLog;
    if (CallSid) {
      callLog = await AiCallLog.findOne({ "awsMetadata.transcribeJobName": CallSid });
    }

    if (!callLog) {
      callLog = await AiCallLog.findOne({ callStatus: "IN_PROGRESS" }).sort({ createdAt: -1 });
    }

    if (!callLog) {
      callLog = new AiCallLog({
        tenantId: "TENANT001",
        partyName: To || "Unknown Contact",
        partyType: "Contact",
        phoneNumber: To || From || "",
        initiatedBy: new mongoose.Types.ObjectId(),
        userName: "Twilio Voice Agent",
        callStatus: "IN_PROGRESS",
      });
    }

    if (RecordingUrl) {
      const audioMp3Url = RecordingUrl.endsWith(".mp3") ? RecordingUrl : `${RecordingUrl}.mp3`;
      callLog.recordingUrl = audioMp3Url;

      // 1. Run AWS Transcribe on the real audio recording
      console.log(`Processing real audio recording with AWS Transcribe: ${audioMp3Url}`);
      const transcribeResult = await transcribeAudioWithAws(
        audioMp3Url,
        callLog.partyName
      );

      callLog.rawTranscript = transcribeResult.rawTranscript as any;
      callLog.callDurationSeconds = transcribeResult.durationSeconds || parseInt(RecordingDuration || "60", 10);

      // 2. Run Amazon Bedrock LLM Summary on real speech transcript
      console.log(`Generating real AI Executive Summary with Amazon Bedrock...`);
      const bedrockSummary = await generateBedrockSummary(
        transcribeResult.rawTranscript,
        callLog.partyName,
        callLog.partyType
      );

      callLog.aiSummary = bedrockSummary as any;
      callLog.callStatus = "COMPLETED";

      // 3. Send Email Transcript to Company Owner
      const ownerEmail = callLog.ownerEmail || process.env.COMPANY_OWNER_EMAIL || process.env.SMTP_USER || "support@mabsolinfotech.com";
      const emailRes = await sendCallTranscriptToOwner({
        ownerEmail,
        partyName: callLog.partyName,
        partyType: callLog.partyType,
        phoneNumber: callLog.phoneNumber,
        callDurationSeconds: callLog.callDurationSeconds,
        initiatedByName: callLog.userName,
        createdAt: callLog.createdAt || new Date(),
        aiSummary: bedrockSummary,
        rawTranscript: transcribeResult.rawTranscript,
        callLogId: callLog._id.toString(),
      });

      if (emailRes.success) {
        callLog.ownerNotified = true;
        callLog.notifiedAt = new Date();
      }

      await callLog.save();

      // 4. Create In-App Notification
      await Notification.create({
        tenantId: "TENANT001",
        title: `📞 Real Call Transcript Received: ${callLog.partyName}`,
        message: `Real Twilio call completed (${callLog.callDurationSeconds}s). Summary: ${bedrockSummary.overview.slice(0, 100)}...`,
        type: "AI_CALL_COMPLETED",
        category: "SYSTEM",
        severity: "info",
        targetRole: "Admin",
        entityId: callLog._id.toString(),
        actionUrl: `/dashboard/ai-calling?logId=${callLog._id}`,
      });
    } else {
      if (CallStatus === "completed" || CallStatus === "no-answer" || CallStatus === "failed") {
        callLog.callStatus = CallStatus.toUpperCase() as any;
        await callLog.save();
      }
    }

    return NextResponse.json({ success: true, callSid: CallSid });
  } catch (error: any) {
    console.error("Twilio Status Webhook Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Twilio webhook processing failed" },
      { status: 500 }
    );
  }
}
