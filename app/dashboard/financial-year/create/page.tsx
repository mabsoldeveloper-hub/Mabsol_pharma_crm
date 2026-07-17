"use client";

import { useEffect, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";

export default function CreateFYPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    companyId: "",
    fyName: "",
    startDate: "",
    endDate: "",
    isCurrent: true,
  });

  useEffect(() => {
    fetch("/api/company-master")
      .then((res) => res.json())
      .then((data) => setCompanies(data));
  }, []);

  const saveFY = async () => {
    try {
      setLoading(true);

      await fetch("/api/financial-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      alert("Financial Year Created");

      setForm({
        companyId: "",
        fyName: "",
        startDate: "",
        endDate: "",
        isCurrent: true,
      });
    } catch {
      alert("Error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg text-sm px-3 py-2 bg-white/50 border border-white/60 text-gray-700 placeholder-gray-400 outline-none focus:bg-white/70 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 transition-all";

  const labelClass =
    "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
          <FaCalendarAlt size={13} />
        </div>
        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
          Create Financial Year
        </h5>
      </div>

      {/* body */}
      <div className="relative p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company */}
          <div>
            <label className={labelClass}>Company</label>
            <select
              className={inputClass}
              value={form.companyId}
              onChange={(e) =>
                setForm({ ...form, companyId: e.target.value })
              }
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* FY Name */}
          <div>
            <label className={labelClass}>FY Name</label>
            <input
              className={inputClass}
              placeholder="2025-26"
              value={form.fyName}
              onChange={(e) =>
                setForm({ ...form, fyName: e.target.value })
              }
            />
          </div>

          {/* Start Date */}
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>

          {/* End Date */}
          <div>
            <label className={labelClass}>End Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.endDate}
              onChange={(e) =>
                setForm({ ...form, endDate: e.target.value })
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 border-t border-gray-200/70 pt-4">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={saveFY}
            disabled={loading}
          >
            {loading ? "Saving..." : "Create FY"}
          </button>
        </div>
      </div>
    </div>
  );
}