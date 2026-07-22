"use client";

interface Props {
  customer: any;
}

export default function CustomerOverview({ customer }: Props) {
  const rows = [
    { label: "Contact Person", value: customer.REF },
    { label: "Mobile", value: customer.PHONE1 },
    { label: "Email", value: customer.MAILNAM },
    { label: "Address", value: customer.PARADD, span: 2 },
    { label: "City", value: customer.CITY },
    { label: "State", value: customer.STATE },
    { label: "Country", value: customer.COUNTRY },
    { label: "Pincode", value: customer.PINCODE },
    { label: "GST Number", value: customer.GSTNO },
    { label: "Drug License", value: customer.DLNO },
    { label: "Price List", value: customer.PRICE },
    { label: "Credit Days", value: customer.DUEDAYS ?? 0 },
  ];

  return (
    <div className="relative isolate overflow-hidden rounded-xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(52,56,114,0.08)] mt-3 print:bg-white print:backdrop-blur-none print:shadow-none print:border print:border-slate-300">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent print:hidden" />

      <div className="relative">
        <div className="px-4 py-2.5 border-b border-white/60">
          <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer Information</h5>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-3.5">
            {rows.map((r) => (
              <div key={r.label} className={r.span === 2 ? "col-span-2" : ""}>
                <p className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">{r.label}</p>
                <p className="text-xs font-semibold text-slate-800 truncate">{r.value || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}