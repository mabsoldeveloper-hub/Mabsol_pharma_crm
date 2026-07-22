"use client";

export default function CustomerHeader({ customer }: any) {
  const fields = [
    { label: "Code", value: customer.CODEP },
    { label: "GST No", value: customer.GSTNO },
    { label: "Drug Lic.", value: customer.DLNO },
    { label: "Mobile", value: customer.PHONE1 },
    { label: "City", value: customer.CITY },
    { label: "Contact", value: customer.REF },
  ];

  return (
    <div className="relative isolate overflow-hidden rounded-xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(52,56,114,0.08)] h-full print:bg-white print:backdrop-blur-none print:shadow-none print:border print:border-slate-300">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent print:hidden" />
      <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br from-[#343872]/15 to-transparent blur-2xl print:hidden" />

      <div className="relative p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <img
            src="/avatar.png"
            alt={customer.PARNAM}
            className="rounded-xl border border-white/80 shadow-sm object-cover flex-shrink-0"
            style={{ width: 56, height: 56 }}
          />

          {/* Name + status */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800 truncate">{customer.PARNAM}</h2>
              {customer.STATUS === "Y" ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100/80 text-emerald-700 text-[10px] font-medium px-2 py-0.5 ring-1 ring-emerald-300/50">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-rose-100/80 text-rose-700 text-[10px] font-medium px-2 py-0.5 ring-1 ring-rose-300/50">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Customer Profile</p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">{f.label}</p>
              <p className="text-xs font-semibold text-slate-800 truncate">{f.value || "-"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}