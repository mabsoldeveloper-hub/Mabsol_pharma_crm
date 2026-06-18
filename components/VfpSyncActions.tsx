"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaRedoAlt, FaSearch } from "react-icons/fa";

export default function VfpSyncActions() {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function queueAction(action: "rescan" | "sync-now") {
    setBusyAction(action);
    setMessage("");

    try {
      const response = await fetch(`/api/vfp/${action}`, {
        method: "POST",
      });
      const data = await response.json();

      setMessage(data.message || "Queued.");
      router.refresh();
    } catch {
      setMessage("Unable to queue VFP sync action.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="vfp-actions">
      <button
        className="btn btn-outline-primary btn-sm"
        disabled={Boolean(busyAction)}
        onClick={() => queueAction("rescan")}
        type="button"
      >
        <FaSearch className="me-2" />
        {busyAction === "rescan" ? "Queueing..." : "Rescan"}
      </button>
      <button
        className="btn btn-primary btn-sm"
        disabled={Boolean(busyAction)}
        onClick={() => queueAction("sync-now")}
        type="button"
      >
        <FaRedoAlt className="me-2" />
        {busyAction === "sync-now" ? "Queueing..." : "Sync Now"}
      </button>
      {message && <span className="vfp-action-message">{message}</span>}
    </div>
  );
}
