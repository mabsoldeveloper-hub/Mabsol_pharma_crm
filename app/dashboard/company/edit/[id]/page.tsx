"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaBuilding } from "react-icons/fa";

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (id) {
      loadCompany();
    }
  }, [id]);

  const loadCompany = async () => {
    try {
      setFetching(true);
      const res = await fetch(`/api/company-master/${id}`);
      const data = await res.json();
      setForm(data);
    } catch (error) {
      console.log(error);
    } finally {
      setFetching(false);
    }
  };

  const updateCompany = async () => {
    try {
      setLoading(true);

      await fetch(`/api/company-master/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      alert("Company Updated");
    } catch {
      alert("Update Failed");
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
          <FaBuilding size={13} />
        </div>
        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
          Edit Company
        </h5>
      </div>

      {/* body */}
      <div className="relative p-5">
        {fetching ? (
          <div className="py-10 text-center text-sm text-gray-400">
            Loading...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div>
                <label className={labelClass}>Company Name</label>
                <input
                  className={inputClass}
                  value={form.companyName || ""}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                />
              </div>

              {/* Owner Name */}
              <div>
                <label className={labelClass}>Owner Name</label>
                <input
                  className={inputClass}
                  value={form.ownerName || ""}
                  onChange={(e) =>
                    setForm({ ...form, ownerName: e.target.value })
                  }
                />
              </div>

              {/* Email */}
              <div>
                <label className={labelClass}>Email</label>
                <input
                  className={inputClass}
                  value={form.email || ""}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>

              {/* Mobile */}
              <div>
                <label className={labelClass}>Mobile</label>
                <input
                  className={inputClass}
                  value={form.mobile || ""}
                  onChange={(e) =>
                    setForm({ ...form, mobile: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3 border-t border-gray-200/70 pt-4">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={updateCompany}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Company"}
              </button>

              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white/50 hover:bg-white/70 border border-white/60 transition-colors"
                onClick={() => router.push("/dashboard/company/list")}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}