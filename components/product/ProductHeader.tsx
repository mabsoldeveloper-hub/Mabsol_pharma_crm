"use client";

import { FaPills, FaBarcode } from "react-icons/fa";

export default function ProductHeader({ product }: any) {
  return (
    <div
      className="
        group relative rounded-2xl overflow-hidden mb-3
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        transition-all duration-500 ease-out
        hover:shadow-lg
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* ambient gradient accent */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400/20 to-blue-400/10 blur-2xl" />

      <div className="relative flex items-center gap-4 px-5 py-4">
        <div
          className="
            flex items-center justify-center h-12 w-12 rounded-xl shrink-0
            bg-indigo-500/15 text-indigo-600
            ring-1 ring-white/50
            transition-transform duration-500
            group-hover:scale-110 group-hover:rotate-3
          "
        >
          <FaPills size={20} />
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 truncate">
            {product.PRODUCT}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            <FaBarcode size={11} className="text-gray-400" />
            Code:{" "}
            <span className="font-medium text-gray-600">{product.CODE}</span>
          </p>
        </div>
      </div>
    </div>
  );
}