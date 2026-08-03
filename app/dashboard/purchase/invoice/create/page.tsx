import { Suspense } from "react";
import PurchaseBillForm from "@/components/purchase/PurchaseBillForm";

export default function CreatePurchaseBillPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 text-sm">Loading purchase invoice form...</div>}>
      <PurchaseBillForm />
    </Suspense>
  );
}

