"use client";

import { FaEdit, FaPrint } from "react-icons/fa";

export default function ProductQuickActions() {
  return (
    <div
      className="
        relative rounded-2xl overflow-hidden
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        p-4
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      <div className="relative flex flex-col gap-2.5">
        <button
          className="
            group relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
            text-sm font-semibold text-white overflow-hidden
            bg-gradient-to-r from-indigo-500 to-blue-500
            shadow-md shadow-indigo-500/25
            transition-all duration-300 ease-out
            hover:shadow-lg hover:shadow-indigo-500/40 hover:-translate-y-0.5
            active:translate-y-0 active:shadow-sm
          "
        >
          {/* shine sweep */}
          <span className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />
          <FaEdit size={14} className="relative" />
          <span className="relative">Edit Product</span>
        </button>

        <button
          className="
            group relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
            text-sm font-semibold text-white overflow-hidden
            bg-gradient-to-r from-emerald-500 to-green-500
            shadow-md shadow-emerald-500/25
            transition-all duration-300 ease-out
            hover:shadow-lg hover:shadow-emerald-500/40 hover:-translate-y-0.5
            active:translate-y-0 active:shadow-sm
          "
        >
          <span className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />
          <FaPrint size={14} className="relative" />
          <span className="relative">Print</span>
        </button>
      </div>
    </div>
  );
}