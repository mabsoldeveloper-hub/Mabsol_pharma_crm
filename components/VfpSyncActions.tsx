"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaFolderOpen, FaRedoAlt, FaSearch } from "react-icons/fa";
import FolderSelectorModal from "./FolderSelectorModal";

interface VfpSyncActionsProps {
  currentPath?: string;
}

export default function VfpSyncActions({ currentPath = "" }: VfpSyncActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  function handleChooseFolder() {
    setMessage("");
    setIsModalOpen(true);
  }

  return (
     <div className="d-flex align-items-center flex-wrap gap-2">
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
        Choose Folder
      </button>
      {message && <span className="text-muted small w-100 mt-2">{message}</span>}

      <FolderSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPath={currentPath}
        onFolderSelected={(newPath) => {
          setMessage(`Sync folder updated to: ${newPath}`);
          router.refresh();
        }}
      />
    </div>
  );
}
