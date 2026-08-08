"use client";

import React, { useRef } from "react";
import { FaPrint, FaTimes, FaQrcode, FaCheckCircle, FaMapMarkerAlt, FaSignature, FaFileAlt } from "react-icons/fa";

interface FormPdfPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
  submission: any;
}

export default function FormPdfPrintModal({
  isOpen,
  onClose,
  template,
  submission,
}: FormPdfPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !submission || !template) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.title} - ${submission._id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 24px;
              background: #fff;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 800;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-title {
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 4px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 24px;
              font-size: 12px;
            }
            .meta-label {
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              font-size: 10px;
            }
            .meta-val {
              font-weight: 600;
              color: #0f172a;
              margin-top: 2px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #4f46e5;
              text-transform: uppercase;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              margin-top: 20px;
              margin-bottom: 12px;
            }
            .field-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 16px;
            }
            .field-box {
              background: #fff;
              border: 1px solid #f1f5f9;
              padding: 10px;
              border-radius: 6px;
            }
            .field-label {
              font-size: 11px;
              font-weight: 700;
              color: #475569;
            }
            .field-value {
              font-size: 12px;
              color: #0f172a;
              margin-top: 4px;
              word-break: break-word;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #f1f5f9;
              font-weight: 700;
            }
            .footer {
              margin-top: 40px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 10px;
              color: #94a3b8;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const submittedData = submission.data || {};
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `Form: ${template.title} | ID: ${submission._id} | Date: ${new Date(submission.createdAt).toLocaleDateString()}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Actions */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaFileAlt className="text-indigo-400" />
            <span className="font-bold text-sm">Printable Form Report Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <FaPrint /> Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Printable Content Container */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 flex-1" ref={printRef}>
          {/* Header */}
          <div className="header flex items-center justify-between border-b-2 border-indigo-600 pb-4 mb-6">
            <div>
              <div className="brand-title text-xl font-black text-indigo-600 tracking-wider">
                MABSOL PHARMA CRM
              </div>
              <div className="doc-title text-base font-bold text-slate-800 mt-1">
                {template.title}
              </div>
            </div>
            <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 object-contain border p-1 rounded" />
          </div>

          {/* Submitter Metadata Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Submitter</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {submission.submittedBy?.userName || "CRM User"}
              </div>
              <div className="text-[11px] text-slate-500">{submission.submittedBy?.userEmail || "-"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Date & Time</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {new Date(submission.createdAt || Date.now()).toLocaleString()}
              </div>
              <div className="text-[11px] font-mono text-indigo-600">ID: {submission._id}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Approval Status</div>
              <div className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <FaCheckCircle className="text-emerald-600" /> {submission.status || "Approved"}
              </div>
            </div>
          </div>

          {/* Form Fields Data */}
          <div className="space-y-4">
            <div className="section-title text-xs font-bold text-indigo-600 uppercase border-b pb-1">
              Submission Form Responses
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(template.fields || []).map((field: any) => {
                const val = submittedData[field.key];
                if (val === undefined || val === null || val === "") return null;

                // Handle Repeater Sub-grid Tables
                if (Array.isArray(val)) {
                  return (
                    <div key={field.key} className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-xs font-bold text-slate-700 mb-2">{field.label}</div>
                      <table>
                        <thead>
                          <tr>
                            {field.subFields?.map((sf: any) => (
                              <th key={sf.key}>{sf.label}</th>
                            )) || <th>Item Data</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {val.map((row: any, rIdx: number) => (
                            <tr key={rIdx}>
                              {field.subFields?.map((sf: any) => (
                                <td key={sf.key}>{String(row[sf.key] || "-")}</td>
                              )) || <td>{JSON.stringify(row)}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // Handle E-Signature
                if (typeof val === "string" && val.startsWith("data:image")) {
                  return (
                    <div key={field.key} className="col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <FaSignature className="text-indigo-600" /> {field.label}
                      </div>
                      <img src={val} alt="Signature" className="h-16 object-contain mt-2 border bg-white rounded p-1" />
                    </div>
                  );
                }

                // Handle GPS Location
                if (typeof val === "object" && val.lat && val.lng) {
                  return (
                    <div key={field.key} className="col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <FaMapMarkerAlt className="text-rose-600" /> {field.label}
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-1">{val.address || "GPS Stamp Saved"}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Lat: {val.lat}, Lng: {val.lng}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={field.key} className="col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500">{field.label}</div>
                    <div className="text-xs font-semibold text-slate-800 mt-1 whitespace-pre-wrap">
                      {String(val)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Signoff */}
          <div className="footer mt-12 pt-4 border-t flex justify-between text-[10px] text-slate-400">
            <div>Generated automatically via Mabsol Pharma CRM Form Studio</div>
            <div>Verification Stamp: SEC-CONFIRMED</div>
          </div>
        </div>
      </div>
    </div>
  );
}
