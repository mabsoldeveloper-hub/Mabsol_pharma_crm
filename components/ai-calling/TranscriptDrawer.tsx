"use client";

import React from "react";
import {
  X,
  Bot,
  User,
  Clock,
  Phone,
  Calendar,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  ShieldCheck,
  Building,
} from "lucide-react";

interface TranscriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  log: any;
}

export default function TranscriptDrawer({ isOpen, onClose, log }: TranscriptDrawerProps) {
  if (!isOpen || !log) return null;

  const durationMin = Math.floor((log.callDurationSeconds || 0) / 60);
  const durationSec = (log.callDurationSeconds || 0) % 60;
  const formattedDuration = `${durationMin}m ${durationSec}s`;

  const formattedDate = new Date(log.createdAt || Date.now()).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const sentiment = log.aiSummary?.sentiment || "POSITIVE";
  const sentimentColor =
    sentiment === "POSITIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : sentiment === "NEGATIVE"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Drawer Header */}
          <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-start justify-between border-b border-slate-800 shrink-0">
            <div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mb-1">
                <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Mabsol Pharma CRM &bull; Call Record ID #{log._id?.slice(-6)}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                {log.partyName}
                <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {log.partyType}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-[11px] sm:text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {log.phoneNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {formattedDuration}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formattedDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${sentimentColor}`}>
                {sentiment} SENTIMENT
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50">
            
            {/* Owner Email Delivery Status */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">
                    Transcript Delivered to Company Owner
                  </p>
                  <p className="text-[11px] text-emerald-700 truncate">
                    Emailed to: <span className="font-semibold">{log.ownerEmail || "rahulavashist@gmail.com"}</span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-2 py-1 rounded-md shrink-0">
                SENT
              </span>
            </div>

            {/* AI Summary & Insights Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  AWS Bedrock Executive Summary
                </h3>
                <span className="text-[10.5px] text-slate-400 font-mono">Model: Claude 3.5 Sonnet</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {log.aiSummary?.overview || "Executive summary processing or call in progress..."}
              </p>

              {/* Key Takeaways */}
              {log.aiSummary?.keyPoints?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <ListOrdered className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    Key Discussion Points:
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 pl-2">
                    {log.aiSummary.keyPoints.map((point: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {log.aiSummary?.actionItems?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Required Action Items:
                  </h4>
                  <div className="space-y-1.5">
                    {log.aiSummary.actionItems.map((item: string, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs bg-indigo-50/60 border border-indigo-100 text-indigo-900 p-2.5 rounded-xl flex items-start gap-2 font-medium"
                      >
                        <span className="text-indigo-500 shrink-0">👉</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Speaker Diarized Dialogue Transcript */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-600 shrink-0" />
                  Speaker Diarized Dialogue Transcript
                </h3>
                <span className="text-[10.5px] text-slate-400">AWS Transcribe Diarization</span>
              </div>

              <div className="space-y-3 pt-1">
                {(!log.rawTranscript || log.rawTranscript.length === 0) ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Speech transcript not available yet. Please complete the live call and refresh.
                  </div>
                ) : (
                  log.rawTranscript.map((item: any, idx: number) => {
                    const isAgent = item.speaker === "AI_AGENT" || item.speaker === "AGENT" || item.speaker === "Caller / Owner";
                    return (
                      <div
                        key={idx}
                        className={`flex gap-2.5 sm:gap-3 p-3 rounded-xl border ${
                          isAgent
                            ? "bg-indigo-50/40 border-indigo-100 text-slate-800 sm:ml-4"
                            : "bg-slate-50 border-slate-200 text-slate-900 sm:mr-4"
                        }`}
                      >
                        <div
                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                            isAgent
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-700 text-white"
                          }`}
                        >
                          {isAgent ? <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {isAgent ? "🤖 Representative / Owner" : `👤 ${log.partyName}`}
                            </span>
                            <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                              {item.timestamp || ""}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-700 break-words">{item.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Drawer Footer Actions */}
          <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400 truncate">Initiated by: {log.userName || "Admin"}</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              Close Drawer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
