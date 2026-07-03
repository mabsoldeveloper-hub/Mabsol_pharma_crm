"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { FaEye, FaTrashAlt } from "react-icons/fa";

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
    <div className="d-flex align-items-center justify-content-end gap-2">
      {status === "success" ? (
        <Link
          className="btn btn-sm btn-outline-primary d-flex align-items-center"
          href={`/dashboard/vfp/${encodeURIComponent(tableName)}`}
        >
          <FaEye className="me-1" /> View Data
        </Link>
      ) : (
        <span className="text-muted small me-2">Pending</span>
      )}
      <button
        type="button"
        className="btn btn-sm btn-outline-danger d-flex align-items-center"
        onClick={handleDelete}
        disabled={loading}
      >
        <FaTrashAlt className="me-1" /> {loading ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
