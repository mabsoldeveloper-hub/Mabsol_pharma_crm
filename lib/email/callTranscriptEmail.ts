import nodemailer from "nodemailer";

const NAVY = "#343872";
const NAVY_DARK = "#12153A";
const ORANGE = "#fb8c00";
const SURFACE = "#F7F7FD";
const MUTED = "#6668A0";
const BORDER = "#ECEEF9";
const GREEN = "#10B981";
const RED = "#EF4444";

interface EmailCallLogPayload {
  ownerEmail: string;
  partyName: string;
  partyType: string;
  phoneNumber: string;
  callDurationSeconds: number;
  initiatedByName: string;
  createdAt: Date;
  aiSummary: {
    overview: string;
    keyPoints: string[];
    actionItems: string[];
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  };
  rawTranscript: Array<{
    speaker: string;
    text: string;
    timestamp?: string;
  }>;
  callLogId: string;
}

export async function sendCallTranscriptToOwner(payload: EmailCallLogPayload) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const durationMin = Math.floor(payload.callDurationSeconds / 60);
    const durationSec = payload.callDurationSeconds % 60;
    const formattedDuration = `${durationMin}m ${durationSec}s`;
    const formattedDate = new Date(payload.createdAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const sentimentColor =
      payload.aiSummary.sentiment === "POSITIVE"
        ? GREEN
        : payload.aiSummary.sentiment === "NEGATIVE"
        ? RED
        : ORANGE;

    const transcriptHtml = payload.rawTranscript
      .map((item) => {
        const isAgent = item.speaker === "AI_AGENT" || item.speaker === "AGENT";
        const speakerLabel = isAgent ? "🤖 AI Call Assistant" : `👤 ${payload.partyName}`;
        const bg = isAgent ? "#EEF2FF" : "#F9FAFB";
        const borderCol = isAgent ? "#C7D2FE" : "#E5E7EB";

        return `
          <div style="margin-bottom: 12px; padding: 12px 16px; background: ${bg}; border-left: 4px solid ${borderCol}; border-radius: 6px;">
            <div style="font-size: 12px; font-weight: 700; color: ${NAVY}; margin-bottom: 4px;">
              ${speakerLabel} <span style="font-size: 11px; font-weight: 400; color: ${MUTED}; float: right;">${item.timestamp || ""}</span>
            </div>
            <div style="font-size: 13.5px; color: #1F2937; line-height: 1.5;">
              ${item.text}
            </div>
          </div>
        `;
      })
      .join("");

    const keyPointsHtml = payload.aiSummary.keyPoints
      .map(
        (point) =>
          `<li style="margin-bottom: 6px; color: #374151; font-size: 13.5px; line-height: 1.5;">${point}</li>`
      )
      .join("");

    const actionItemsHtml = payload.aiSummary.actionItems
      .map(
        (item) =>
          `<li style="margin-bottom: 6px; color: #1E40AF; font-weight: 600; font-size: 13.5px; line-height: 1.5;">👉 ${item}</li>`
      )
      .join("");

    const htmlContent = `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:${SURFACE}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE}; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid ${BORDER}; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg, ${NAVY_DARK}, ${NAVY}); padding:28px 32px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <div style="color:${ORANGE}; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">
                        📞 AI CALL CONVERSATION RECORD
                      </div>
                      <div style="color:#ffffff; font-size:22px; font-weight:700;">
                        ${payload.partyName} (${payload.partyType})
                      </div>
                      <div style="color:#A6A8D2; font-size:13px; margin-top:4px;">
                        Phone: ${payload.phoneNumber} &bull; Duration: ${formattedDuration}
                      </div>
                    </td>
                    <td align="right" valign="top">
                      <span style="display:inline-block; padding:6px 14px; background:${sentimentColor}; color:#ffffff; font-size:11px; font-weight:800; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">
                        ${payload.aiSummary.sentiment} SENTIMENT
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Call Summary Section -->
            <tr>
              <td style="padding:28px 32px 16px;">
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:20px; margin-bottom:24px;">
                  <h3 style="margin:0 0 8px; color:${NAVY}; font-size:16px; font-weight:700;">
                    📊 Executive Summary & Key Insights
                  </h3>
                  <p style="margin:0 0 16px; color:#475569; font-size:14px; line-height:1.6;">
                    ${payload.aiSummary.overview}
                  </p>

                  ${
                    payload.aiSummary.keyPoints.length > 0
                      ? `<div style="font-weight:700; font-size:13px; color:${NAVY}; margin-bottom:6px;">Key Discussion Points:</div>
                         <ul style="margin:0 0 16px; padding-left:20px;">${keyPointsHtml}</ul>`
                      : ""
                  }

                  ${
                    payload.aiSummary.actionItems.length > 0
                      ? `<div style="font-weight:700; font-size:13px; color:#1E40AF; margin-bottom:6px;">Required Action Items:</div>
                         <ul style="margin:0; padding-left:20px; list-style-type:none;">${actionItemsHtml}</ul>`
                      : ""
                  }
                </div>

                <!-- Call Meta details -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; font-size:13px; color:${MUTED}; border-bottom:1px solid ${BORDER}; padding-bottom:16px;">
                  <tr>
                    <td><strong>Initiated By:</strong> ${payload.initiatedByName}</td>
                    <td align="right"><strong>Call Date:</strong> ${formattedDate}</td>
                  </tr>
                </table>

                <!-- Transcript Accordion / List -->
                <h3 style="margin:0 0 16px; color:${NAVY}; font-size:16px; font-weight:700;">
                  📝 Full Call Dialogue Transcript
                </h3>

                <div style="max-height: 450px; overflow-y: auto; padding-right: 4px;">
                  ${transcriptHtml}
                </div>
              </td>
            </tr>

            <!-- Footer & Call to Action -->
            <tr>
              <td style="padding:20px 32px 28px; background:#FAFBFD; border-top:1px solid ${BORDER}; text-align:center;">
                <p style="margin:0 0 16px; color:${MUTED}; font-size:13px;">
                  This AI Call transcript has been automatically recorded, transcribed via AWS Transcribe, and summarized by AI for CRM audit records.
                </p>
                <div style="font-size:11.5px; color:#94A3B8;">
                  © ${new Date().getFullYear()} Mabsol Pharma CRM. All rights reserved.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Mabsol CRM <${process.env.SMTP_USER}>`,
      to: payload.ownerEmail,
      subject: `📞 AI Call Transcript & Summary: ${payload.partyName} (${payload.partyType})`,
      html: htmlContent,
      text: `AI Call Transcript with ${payload.partyName} (${payload.phoneNumber}). Summary: ${payload.aiSummary.overview}`,
    });

    console.log("AI Call Transcript Email Sent to Owner:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send AI Call Transcript email to owner:", error);
    return { success: false, error: error.message };
  }
}
