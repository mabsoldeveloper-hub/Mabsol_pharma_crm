"use client";

import React from "react";
import {
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUsers,
  FaLayerGroup,
} from "react-icons/fa";

interface FormAnalyticsViewProps {
  template: any;
  submissions: any[];
  total: number;
}

export default function FormAnalyticsView({
  template,
  submissions,
  total,
}: FormAnalyticsViewProps) {
  const approvedCount = submissions.filter((s) => s.status === "Approved").length;
  const pendingCount = submissions.filter(
    (s) => s.status === "Under Review" || s.status === "Submitted"
  ).length;
  const rejectedCount = submissions.filter((s) => s.status === "Rejected").length;

  const approvalRate = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

  // Group by date for submission timeline
  const dateCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    const d = new Date(s.createdAt).toLocaleDateString();
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });

  // Top Submitters
  const submitterCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    const name = s.submittedBy?.userName || "System User";
    submitterCounts[name] = (submitterCounts[name] || 0) + 1;
  });

  const sortedSubmitters = Object.entries(submitterCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
            <FaLayerGroup />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Submissions
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {total}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
            <FaCheckCircle />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Approval Rate
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {approvalRate}%
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">
            <FaClock />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pending / Under Review
            </p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl font-bold">
            <FaTimesCircle />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Rejected
            </p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {rejectedCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Grid Charts & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions Timeline List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <FaChartLine className="text-indigo-500" /> Daily Submissions Trend
          </h3>
          {Object.keys(dateCounts).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No timeline data available.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {Object.entries(dateCounts).slice(0, 7).map(([date, count]) => {
                const maxCount = Math.max(...Object.values(dateCounts), 1);
                const widthPct = Math.round((count / maxCount) * 100);

                return (
                  <div key={date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{date}</span>
                      <span>{count} entries</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Submitters Leaderboard */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <FaUsers className="text-emerald-500" /> Top Respondents & Staff
          </h3>
          {sortedSubmitters.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No submitter data available.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {sortedSubmitters.slice(0, 5).map(([name, count], idx) => (
                <div
                  key={name}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {name}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg">
                    {count} submissions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
