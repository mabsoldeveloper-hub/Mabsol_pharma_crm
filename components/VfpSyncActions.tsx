"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaFolderOpen, FaRedoAlt, FaSearch } from "react-icons/fa";

interface VfpSyncActionsProps {
  currentPath?: string;
}

export default function VfpSyncActions({ currentPath = "" }: VfpSyncActionsProps) {
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

  async function handleChooseFolder() {
    setBusyAction("choose-folder");
    setMessage("");
    try {
      const response = await fetch("/api/vfp/select-folder-dialog", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success && data.path) {
        // Save the configuration to the database
        const configRes = await fetch("/api/vfp/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataDir: data.path }),
        });
        const configData = await configRes.json();

        if (configData.success) {
          setMessage(`Sync folder updated to: ${data.path}`);
          router.refresh();
        } else {
          setMessage(`Error saving directory: ${configData.error}`);
        }
      } else if (data.cancelled) {
        setMessage("Folder selection cancelled.");
      } else {
        setMessage(`Error: ${data.error || "Unable to open folder dialog."}`);
      }
    } catch {
      setMessage("Failed to open local folder selection window.");
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
      <button
        className="btn btn-outline-secondary btn-sm"
        disabled={Boolean(busyAction)}
        onClick={handleChooseFolder}
        type="button"
      >
        <FaFolderOpen className="me-2" />
        {busyAction === "choose-folder" ? "Opening Window..." : "Choose Folder"}
      </button>
      {message && <span className="vfp-action-message w-100 mt-2">{message}</span>}
    </div>
  );
}
