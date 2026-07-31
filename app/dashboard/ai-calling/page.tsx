import React from "react";
import AiCallLogsTable from "@/components/ai-calling/AiCallLogsTable";

export const metadata = {
  title: "AI Voice Calling & Transcripts - Mabsol Pharma CRM",
  description: "Automated AI voice calls, speech-to-text transcripts, and executive summaries sent to Company Owner.",
};

export default function AiCallingPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AiCallLogsTable />
    </div>
  );
}
