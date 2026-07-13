"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";

interface TableActionsProps {
  tableName: string;
  status: string;
}

export default function TableActions({ tableName, status }: TableActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = confirm(
      `Are you sure you want to delete all synced data and metadata for '${tableName}'? This will drop the MongoDB collection and cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/vfp/delete-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.refresh();
      } else {
        alert(data.error || "Failed to delete table data.");
      }
    } catch {
      alert("Error calling delete API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {status === "success" ? (
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 border border-indigo-200 text-indigo-700 bg-white hover:bg-slate-50 rounded-2xl transition-colors"
          href={`/dashboard/vfp/${encodeURIComponent(tableName)}`}
        >
          <Eye size={13} /> View Data
        </Link>
      ) : (
        <span className="text-slate-400 text-xs mr-2 font-medium">Pending</span>
      )}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 border border-red-200 text-red-700 bg-white hover:bg-red-50 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 size={13} /> {loading ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
