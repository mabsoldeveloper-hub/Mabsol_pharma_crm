"use client";

import React, { useState } from "react";
import { PhoneCall, X, Loader2, Sparkles, User, Mail, ShieldAlert, PhoneForwarded, Mic } from "lucide-react";

interface InitiateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLog: any) => void;
  initialPartyName?: string;
  initialPhoneNumber?: string;
  initialPartyType?: string;
}

export default function InitiateCallModal({
  isOpen,
  onClose,
  onSuccess,
  initialPartyName = "",
  initialPhoneNumber = "",
  initialPartyType = "Doctor",
}: InitiateCallModalProps) {
  const [partyType, setPartyType] = useState(initialPartyType);
  const [partyName, setPartyName] = useState(initialPartyName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [callMode, setCallMode] = useState<"BRIDGE_TALK" | "AI_TALK">("BRIDGE_TALK");
  const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("+9198307199529");
  const [callObjective, setCallObjective] = useState("CRM Follow-up & Discussion");
  const [ownerEmail, setOwnerEmail] = useState("rahulavashist@gmail.com");

  const [loading, setLoading] = useState(false);
  const [stepMessage, setStepMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim() || !phoneNumber.trim()) {
      setErrorMsg("Contact Name and Target Phone Number are required.");
      return;
    }

    if (callMode === "BRIDGE_TALK" && !ownerPhoneNumber.trim()) {
      setErrorMsg("Your Phone Number is required to bridge the 2-way call.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    setStepMessage("Placing 2-Way live call to bridge both phones via Twilio...");

    try {
      const res = await fetch("/api/ai-calling/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyName: partyName.trim(),
          partyType: partyType.trim(),
          phoneNumber: phoneNumber.trim(),
          callMode,
          ownerPhoneNumber: ownerPhoneNumber.trim(),
          callObjective: callObjective.trim(),
          companyOwnerEmail: ownerEmail.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to initiate 2-way call");
      }

      onSuccess(data.callLog);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while launching call.");
    } finally {
      setLoading(false);
      setStepMessage("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        
        {/* Modal Header - Sticky Top */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 sm:px-6 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex flex-wrap items-center gap-2">
                Initiate 2-Way Live Phone Call
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  2-Way Phone Bridge
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Connects target contact + your phone in a live 2-way conversation & records dialogue.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          
          {errorMsg && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Calling Mode Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">2-Way Calling Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCallMode("BRIDGE_TALK")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  callMode === "BRIDGE_TALK"
                    ? "bg-indigo-50/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <PhoneForwarded className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0 ${callMode === "BRIDGE_TALK" ? "text-indigo-600" : "text-slate-400"}`} />
                <div>
                  <div className="text-xs font-bold">2-Way Live Phone Call</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">Connects Target + Your mobile in live 2-way talk</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCallMode("AI_TALK")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  callMode === "AI_TALK"
                    ? "bg-indigo-50/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Mic className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0 ${callMode === "AI_TALK" ? "text-indigo-600" : "text-slate-400"}`} />
                <div>
                  <div className="text-xs font-bold">AI Voice Bot Recording</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">Voice bot speaks & records user audio response</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Contact Type (Free Text)
              </label>
              <input
                type="text"
                placeholder="e.g. Doctor, Chemist, Client"
                value={partyType}
                onChange={(e) => setPartyType(e.target.value)}
                disabled={loading}
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Target Contact Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 99918 12580"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {callMode === "BRIDGE_TALK" && (
            <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
              <label className="text-xs font-bold text-indigo-900 block mb-1">
                Your Personal Mobile Number (To Receive & Talk 2-Way)
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98307 19952"
                value={ownerPhoneNumber}
                onChange={(e) => setOwnerPhoneNumber(e.target.value)}
                disabled={loading}
                className="w-full text-xs sm:text-sm rounded-xl border border-indigo-300 bg-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
              <p className="text-[10.5px] text-indigo-600 mt-1">
                Twilio will dial the target contact and bridge your mobile number so both of you talk live on your phones!
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Contact / Person Name
            </label>
            <input
              type="text"
              placeholder="e.g. Harsh, Dr. Sharma"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              disabled={loading}
              className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Call Objective / Discussion Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Product sampling, dispatch status"
              value={callObjective}
              onChange={(e) => setCallObjective(e.target.value)}
              disabled={loading}
              className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between flex-wrap gap-1">
              <span>Owner Email Notification</span>
              <span className="text-[10.5px] text-slate-400 font-normal">(Defaults to SMTP/Owner Email)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                placeholder="rahulavashist@gmail.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                disabled={loading}
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Call Execution Status Indicator */}
          {loading && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex items-center gap-3 animate-pulse">
              <Loader2 className="h-5 w-5 text-indigo-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-semibold text-indigo-900">{stepMessage}</p>
                <p className="text-[10.5px] text-indigo-600">Dials phones & records 2-way voice channel...</p>
              </div>
            </div>
          )}

          {/* Actions - Bottom Footer Sticky */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-slate-900 hover:from-indigo-700 hover:to-slate-950 rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating Call...
                </>
              ) : (
                <>
                  <PhoneCall className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Start 2-Way Live Phone Call</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
