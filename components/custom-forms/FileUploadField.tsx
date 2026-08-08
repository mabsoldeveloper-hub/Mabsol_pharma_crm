"use client";

import React, { useState } from "react";
import { FaCloudUploadAlt, FaFileAlt, FaTimes, FaCheck, FaSpinner, FaEye, FaExternalLinkAlt } from "react-icons/fa";

interface FileUploadFieldProps {
  value?: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
}

export default function FileUploadField({
  value,
  onChange,
  readOnly = false,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileData = typeof value === "object" && value !== null
    ? value
    : typeof value === "string" && value.length > 0
    ? { url: value, name: value.split("/").pop() || "Uploaded File" }
    : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/custom-forms/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const fileObj = {
          url: data.url,
          name: data.fileName || file.name,
          size: data.size || file.size,
          mimeType: data.mimeType || file.type,
        };
        onChange(fileObj);
      } else {
        setErrorMsg(data.error || "Failed to upload file.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    if (readOnly) return;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {fileData ? (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200 truncate">
            <FaCheck className="text-emerald-600 shrink-0" />
            <FaFileAlt className="text-indigo-500 shrink-0" />
            <span className="truncate">{fileData.name || "Uploaded Document"}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fileData.url && (
              <a
                href={fileData.url}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md flex items-center gap-1 transition-all text-[11px]"
              >
                <FaEye /> View File <FaExternalLinkAlt className="text-[9px]" />
              </a>
            )}

            {!readOnly && (
              <button
                type="button"
                onClick={removeFile}
                className="text-rose-500 hover:text-rose-700 p-1 text-sm"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      ) : (
        <label
          className={`block border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50/50 dark:bg-slate-900/30 transition-all ${
            readOnly || uploading
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20"
          }`}
        >
          {uploading ? (
            <div className="py-2 flex flex-col items-center justify-center space-y-2">
              <FaSpinner className="animate-spin text-2xl text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-600">
                Uploading file to server...
              </span>
            </div>
          ) : (
            <>
              <FaCloudUploadAlt className="mx-auto text-2xl text-indigo-500 mb-1" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Click to upload file / photo
              </span>
              <span className="text-[10px] text-slate-400">
                JPG, PNG, PDF or DOC (Max 10MB)
              </span>
              <input
                type="file"
                disabled={readOnly || uploading}
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
        </label>
      )}

      {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}
    </div>
  );
}
