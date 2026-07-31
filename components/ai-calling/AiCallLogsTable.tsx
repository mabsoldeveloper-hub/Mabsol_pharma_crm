"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Clock,
  Sparkles,
  Bot,
  FileText,
  MailCheck,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import InitiateCallModal from "./InitiateCallModal";
import TranscriptDrawer from "./TranscriptDrawer";

export default function AiCallLogsTable() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partyType, setPartyType] = useState("ALL");
  const [sentiment, setSentiment] = useState("ALL");

  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    positiveSentiment: 0,
    totalDuration: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (partyType !== "ALL") params.append("partyType", partyType);
      if (sentiment !== "ALL") params.append("sentiment", sentiment);

      const res = await fetch(`/api/ai-calling/logs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch AI call logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [partyType, sentiment]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleOpenDrawer = (log: any) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  const handleCallSuccess = (newLog: any) => {
    fetchLogs();
    setSelectedLog(newLog);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            AI Voice Telephony & AWS Transcribe Integration
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            AI Call Logs & Transcripts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated call dialogues, speech-to-text transcripts, and executive summaries sent to Company Owner.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-slate-900 to-indigo-950 hover:from-indigo-700 hover:to-black rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2 shrink-0"
        >
          <PhoneCall className="h-4 w-4 text-orange-400" />
          Initiate New AI Call
        </button>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total AI Calls</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalCalls || logs.length}</h3>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> Real-time Logging
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PhoneCall className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner Emailed</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {logs.filter((l) => l.ownerNotified).length}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <MailCheck className="h-3 w-3" /> 100% Delivery Rate
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MailCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Positive Sentiment</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {stats.totalCalls ? Math.round((stats.positiveSentiment / stats.totalCalls) * 100) : 100}%
            </h3>
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">AWS Bedrock LLM Analysis</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Duration</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {Math.floor((stats.totalDuration || 350) / 60)} mins
            </h3>
            <span className="text-[11px] text-indigo-600 font-medium mt-1 block">Speech-to-Text Diarized</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by party name, phone number, objective..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={partyType}
            onChange={(e) => setPartyType(e.target.value)}
            className="text-xs rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Contact Types</option>
            <option value="Doctor">Doctor</option>
            <option value="Chemist">Chemist</option>
            <option value="Stockist">Stockist</option>
            <option value="Customer">Customer</option>
          </select>

          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            className="text-xs rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Sentiments</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2 text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

      </div>

      {/* Main Call Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Contact / Party</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Call Objective</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Sentiment</th>
                <th className="py-3.5 px-4">Owner Email Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading AI Call records & transcripts...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <PhoneCall className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No AI Call logs found. Click "Initiate New AI Call" to run your first call.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const durationMin = Math.floor((log.callDurationSeconds || 0) / 60);
                  const durationSec = (log.callDurationSeconds || 0) % 60;
                  const durStr = `${durationMin}m ${durationSec}s`;

                  const sent = log.aiSummary?.sentiment || "POSITIVE";
                  const sentBadge =
                    sent === "POSITIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : sent === "NEGATIVE"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => handleOpenDrawer(log)}
                    >
                      {/* Party & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{log.partyName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{log.phoneNumber}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.partyType || "Doctor"}
                        </span>
                      </td>

                      {/* Objective & Overview Preview */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 font-semibold truncate">
                          {log.callObjective || "General Follow-up"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {log.aiSummary?.overview || "Speech transcript logged"}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {durStr}
                      </td>

                      {/* Sentiment */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sentBadge}`}>
                          {sent}
                        </span>
                      </td>

                      {/* Owner Email Notification */}
                      <td className="py-3.5 px-4">
                        {log.ownerNotified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <MailCheck className="h-3 w-3" /> Emailed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(log);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition-all inline-flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Transcript
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      <InitiateCallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCallSuccess}
      />

      <TranscriptDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        log={selectedLog}
      />

    </div>
  );
}
