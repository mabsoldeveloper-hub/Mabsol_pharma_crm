"use client";

import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaWhatsapp,
  FaQrcode,
  FaCopy,
  FaCheck,
  FaShareAlt,
  FaDownload,
  FaExternalLinkAlt,
  FaLock,
  FaGlobe,
  FaSms,
} from "react-icons/fa";

interface FormShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  formTemplate: {
    formId: string;
    title: string;
    description?: string;
    accessMode?: string;
    accessPin?: string;
  } | null;
}

export default function FormShareModal({
  isOpen,
  onClose,
  formTemplate,
}: FormShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (formTemplate) {
      const publicUrl = `${origin}/public-form/${formTemplate.formId}`;
      setWhatsappMsg(
        `Hello! Please fill out the form "${formTemplate.title}": ${publicUrl}`
      );
    }
  }, [formTemplate, origin]);

  if (!isOpen || !formTemplate) return null;

  const publicUrl = `${origin}/public-form/${formTemplate.formId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    publicUrl
  )}&color=4f46e5&margin=10`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPin = () => {
    if (formTemplate.accessPin) {
      navigator.clipboard.writeText(formTemplate.accessPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;
    window.open(waUrl, "_blank");
  };

  const handleShareSms = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(whatsappMsg)}`;
    window.open(smsUrl, "_blank");
  };

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `QR_${formTemplate.formId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading QR:", err);
      window.open(qrCodeUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <FaShareAlt className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                Share Form & QR Code
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5 max-w-xs truncate">
                {formTemplate.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Access Badge */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {formTemplate.accessMode === "Public" ? (
                <FaGlobe className="text-emerald-500" />
              ) : (
                <FaLock className="text-amber-500" />
              )}
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Access Mode: {formTemplate.accessMode || "Internal"}
              </span>
            </div>
            {formTemplate.accessPin && (
              <button
                onClick={handleCopyPin}
                className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5 hover:opacity-90"
              >
                PIN: {formTemplate.accessPin}
                {copiedPin ? <FaCheck className="text-emerald-600" /> : <FaCopy />}
              </button>
            )}
          </div>

          {/* Direct Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Public Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                {copied ? <FaCheck /> : <FaCopy />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                title="Open Link"
              >
                <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>
          </div>

          {/* Quick WhatsApp & SMS Sharing */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              1-Click Message Share
            </label>
            <textarea
              rows={2}
              value={whatsappMsg}
              onChange={(e) => setWhatsappMsg(e.target.value)}
              className="w-full p-3 text-xs border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <FaWhatsapp className="text-base" /> Share on WhatsApp
              </button>
              <button
                onClick={handleShareSms}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <FaSms className="text-base" /> Share via SMS
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
              <img
                src={qrCodeUrl}
                alt="Form QR Code"
                className="w-40 h-40 object-contain rounded-lg"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                <FaQrcode className="text-indigo-600" /> Printable Form QR Code
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Scan with any smartphone camera to open form instantly
              </p>
            </div>

            <button
              onClick={handleDownloadQr}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <FaDownload /> Download PNG QR Code
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
