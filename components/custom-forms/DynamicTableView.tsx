"use client";

import React, { useState } from "react";
import {
  FaFileExcel,
  FaSearch,
  FaCalendarAlt,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaQrcode,
  FaShareAlt,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { FormFieldConfig } from "./FormBuilder";

interface DynamicTableViewProps {
  template: {
    formId: string;
    title: string;
    description?: string;
    fields: FormFieldConfig[];
    accessMode?: string;
    approvalWorkflow?: { enabled: boolean; approverRole: string };
  };
  submissions: any[];
  total: number;
  loading: boolean;
  onRefresh?: () => void;
}

export default function DynamicTableView({
  template,
  submissions,
  total,
  loading,
  onRefresh,
}: DynamicTableViewProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/public-form/${template.formId}`
    : `/public-form/${template.formId}`;

  const handleApprovalAction = async (submissionId: string, action: "Approved" | "Rejected") => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/custom-forms/submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          action,
          managerName: "Admin Manager",
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (selectedSubmission) {
          setSelectedSubmission({ ...selectedSubmission, status: action });
        }
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || "Failed to update approval status.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!submissions || submissions.length === 0) return;

    const headers = [
      "Submission ID",
      "Submitted Date",
      "Submitted By",
      "Status",
      ...template.fields.map((f) => f.label),
      "Remarks",
    ];

    const rows = submissions.map((sub) => {
      const fieldValues = template.fields.map((f) => {
        const val = sub.data ? sub.data[f.key] : "";
        if (typeof val === "boolean") return val ? "Yes" : "No";
        return val ?? "";
      });

      return [
        sub._id,
        new Date(sub.createdAt).toLocaleString(),
        sub.submittedBy?.userName || "System User",
        sub.status || "Submitted",
        ...fieldValues,
        sub.remarks || "",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${template.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_export_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Table Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Total Submissions: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{total}</span>
          </span>

          {template.approvalWorkflow?.enabled && (
            <span className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <FaClock /> Manager Approval Enabled
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            <FaQrcode /> Public Link & QR Code
          </button>

          <button
            onClick={exportToExcel}
            disabled={submissions.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <FaFileExcel /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 font-medium animate-pulse">
            Loading form submissions data...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-600 dark:text-slate-300 font-semibold">
              No entries found for this form yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Entries will appear here automatically once submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  {template.fields.map((field) => (
                    <th key={field.key} className="py-3.5 px-4 min-w-[140px]">
                      {field.label}
                    </th>
                  ))}
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                {submissions.map((sub, idx) => (
                  <tr
                    key={sub._id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-all"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleDateString()}{" "}
                      <span className="text-[10px] text-slate-400">
                        {new Date(sub.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {sub.submittedBy?.userName || "System User"}
                    </td>

                    {/* Dynamic Fields */}
                    {template.fields.map((field) => {
                      const val = sub.data ? sub.data[field.key] : "";
                      let displayVal = val;

                      if (typeof val === "boolean") {
                        displayVal = val ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-semibold text-[10px]">
                            Yes
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded text-[10px]">
                            No
                          </span>
                        );
                      } else if (val === null || val === undefined || val === "") {
                        displayVal = <span className="text-slate-300 dark:text-slate-600">-</span>;
                      }

                      return (
                        <td key={field.key} className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {displayVal}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 font-semibold rounded-full text-[10px] ${
                          sub.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : sub.status === "Rejected"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {sub.status || "Submitted"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {template.approvalWorkflow?.enabled && sub.status === "Under Review" && (
                          <>
                            <button
                              onClick={() => handleApprovalAction(sub._id, "Approved")}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                            >
                              <FaCheck /> Approve
                            </button>
                            <button
                              onClick={() => handleApprovalAction(sub._id, "Rejected")}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                            >
                              <FaTimes /> Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shareable QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                <FaQrcode className="text-indigo-500" /> Share Form & QR Code
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Public Shareable Form Link:
              </p>
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  alert("Public link copied to clipboard!");
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 mx-auto"
              >
                <FaShareAlt /> Copy Public Link
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Submission Entry Details
              </h3>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Submitted By: <strong>{selectedSubmission.submittedBy?.userName || "System User"}</strong></span>
                <span>{new Date(selectedSubmission.createdAt).toLocaleString()}</span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                {template.fields.map((f) => (
                  <div key={f.key} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                    <span className="text-slate-500 font-medium">{f.label}:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {String(selectedSubmission.data?.[f.key] ?? "-")}
                    </span>
                  </div>
                ))}
              </div>

              {selectedSubmission.remarks && (
                <div className="pt-2 text-slate-600 dark:text-slate-400 italic">
                  Remarks: {selectedSubmission.remarks}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <div className="flex gap-2">
                {selectedSubmission.status === "Under Review" && (
                  <>
                    <button
                      onClick={() => handleApprovalAction(selectedSubmission._id, "Approved")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApprovalAction(selectedSubmission._id, "Rejected")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
