import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import AiCallLog from "@/models/AiCallLog";
import Notification from "@/models/Notification";
import {
  fetchTwilioRecordingForCall,
  transcribeAudioWithAws,
  generateBedrockSummary,
} from "@/lib/aws/aiVoiceService";
import { sendCallTranscriptToOwner } from "@/lib/email/callTranscriptEmail";

async function connectDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI as string);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const partyType = searchParams.get("partyType") || "";
    const status = searchParams.get("status") || "";
    const sentiment = searchParams.get("sentiment") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const logId = searchParams.get("logId") || "";

    if (logId) {
      // if (!mongoose.Types.ObjectId.isValid(logId)) {
        return NextResponse.json({ success: false, error: "Invalid log ID" }, { status: 400 });
      }
      let singleLog = await AiCallLog.findById(logId);
      if (!singleLog) {
        return NextResponse.json({ success: false, error: "Call log not found" }, { status: 404 });
      }

      // Auto Sync Recording from Twilio API if call ended or pending transcript
      if (
        (singleLog.callStatus === "IN_PROGRESS" || !singleLog.rawTranscript || singleLog.rawTranscript.length === 0) &&
        singleLog.awsMetadata?.transcribeJobName?.startsWith("CA")
      ) {
        const callSid = singleLog.awsMetadata.transcribeJobName;
        // const recData = await fetchTwilioRecordingForCall(callSid);

        if (recData?.recordingUrl) {
          try {
            singleLog.recordingUrl = recData.recordingUrl;
            singleLog.callDurationSeconds = recData.duration;

            const transcribeRes = await transcribeAudioWithAws(
              recData.recordingUrl,
              singleLog.partyName
            );

            singleLog.rawTranscript = transcribeRes.rawTranscript as any;
            if (transcribeRes.durationSeconds > 0) {
              singleLog.callDurationSeconds = transcribeRes.durationSeconds;
            }

            const bedrockSummary = await generateBedrockSummary(
              transcribeRes.rawTranscript,
              singleLog.partyName,
              singleLog.partyType
            );

            singleLog.aiSummary = bedrockSummary as any;
            singleLog.callStatus = "COMPLETED";

            const ownerEmail = singleLog.ownerEmail || process.env.COMPANY_OWNER_EMAIL || process.env.SMTP_USER || "rahulavashist@gmail.com";
            // const emailRes = await sendCallTranscriptToOwner({
              ownerEmail,
              partyName: singleLog.partyName,
              partyType: singleLog.partyType,
              phoneNumber: singleLog.phoneNumber,
              callDurationSeconds: singleLog.callDurationSeconds,
              initiatedByName: singleLog.userName,
              createdAt: singleLog.createdAt || new Date(),
              aiSummary: bedrockSummary,
              rawTranscript: transcribeRes.rawTranscript,
              callLogId: singleLog._id.toString(),
            });

            if (emailRes.success) {
              singleLog.ownerNotified = true;
              singleLog.notifiedAt = new Date();
            }

            await singleLog.save();
          } catch (syncErr) {
            console.error("Auto Sync Twilio Recording Error:", syncErr);
          }
        }
      }

      return NextResponse.json({ success: true, log: singleLog });
    }

    const query: any = {};

    if (search) {
      query.$or = [
        { partyName: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { callObjective: { $regex: search, $options: "i" } },
      ];
    }

    if (partyType && partyType !== "ALL") {
      query.partyType = partyType;
    }

    if (status && status !== "ALL") {
      query.callStatus = status;
    }

    if (sentiment && sentiment !== "ALL") {
      query["aiSummary.sentiment"] = sentiment;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AiCallLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AiCallLog.countDocuments(query),
    ]);

    const stats = await AiCallLog.aggregate([
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          completedCalls: {
            $sum: { $cond: [{ $eq: ["$callStatus", "COMPLETED"] }, 1, 0] },
          },
          positiveSentiment: {
            $sum: { $cond: [{ $eq: ["$aiSummary.sentiment", "POSITIVE"] }, 1, 0] },
          },
          totalDuration: { $sum: "$callDurationSeconds" },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: stats[0] || {
        totalCalls: 0,
        completedCalls: 0,
        positiveSentiment: 0,
        totalDuration: 0,
      },
    });
  } catch (error: any) {
    console.error("Fetch AI Call Logs Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch AI call logs" },
      { status: 500 }
    );
  }
}
