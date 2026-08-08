"use client";

import React, { useState } from "react";
import { FaMagic, FaTimes, FaRobot, FaStar, FaArrowRight, FaCheck } from "react-icons/fa";

interface AiFormStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySchema: (schema: any) => void;
}

export default function AiFormStudioModal({
  isOpen,
  onClose,
  onApplySchema,
}: AiFormStudioModalProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const presets = [
    {
      title: "📋 Doctor Call DCR & Sampling",
      prompt: "Create an MR Daily Call Report form with Doctor selection, discussion notes, sample quantity repeater, and live GPS stamp.",
    },
    {
      title: "⭐ Doctor Brand Preference Survey",
      prompt: "Create a Doctor Feedback Survey with rating questions, specialty select dropdown, and prescription preference.",
    },
    {
      title: "💸 MR Expense & Travel Claim",
      prompt: "Create an MR Daily Travel Expense Claim Form with expense itemized list repeater, travel type, and file upload receipt proof.",
    },
    {
      title: "🏪 New Chemist Order & Stockist Booking",
      prompt: "Create a Chemist POB Order Booking Form with party name, product items repeater table, unit rates, and signature.",
    },
  ];

  if (!isOpen) return null;

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || prompt;
    if (!textToUse.trim()) {
      setError("Please enter a prompt or pick a preset.");
      return;
    }

    try {
      setError("");
      setGenerating(true);
      const res = await fetch("/api/custom-forms/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToUse }),
      });
      const data = await res.json();
      if (data.success && data.formSchema) {
        onApplySchema(data.formSchema);
        onClose();
      } else {
        setError(data.error || "Failed to generate AI form.");
      }
    } catch (err) {
      console.error("AI Generation error:", err);
      setError("An unexpected error occurred while generating the form.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <FaMagic className="text-xl text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                Form Studio AI Assistant
              </h3>
              <p className="text-xs text-purple-100 mt-0.5">
                Generate complete forms in seconds using AI prompts
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
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Presets Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FaStar className="text-amber-500" /> Quick AI Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(item.prompt);
                    handleGenerate(item.prompt);
                  }}
                  disabled={generating}
                  className="p-3 text-left bg-slate-50 dark:bg-slate-900/60 hover:bg-violet-50 dark:hover:bg-violet-950/40 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 rounded-2xl transition-all group"
                >
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Prompt Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FaRobot className="text-indigo-500" /> Custom AI Prompt
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a doctor feedback form with brand rating, next visit date, and e-signature stamp..."
              className="w-full p-3.5 text-xs border border-slate-300 dark:border-slate-700 rounded-2xl dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="w-full py-3 px-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <FaMagic className="animate-spin text-amber-300" />
                AI is Designing Your Form...
              </>
            ) : (
              <>
                <FaMagic className="text-amber-300" /> Generate Form Schema with AI <FaArrowRight className="text-xs" />
              </>
            )}
          </button>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
