"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FolderOpen, RefreshCw, Search, Terminal } from "lucide-react";
import FolderSelectorModal from "./FolderSelectorModal";
import VfpConfigWizard from "./VfpConfigWizard";

interface VfpSyncActionsProps {
  currentPath?: string;
}

export default function VfpSyncActions({ currentPath = "" }: VfpSyncActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

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

  async function handleLaunchVfp() {
    setBusyAction("launch-vfp");
    setMessage("");

    try {
      const response = await fetch("/api/vfp/launch-vfp", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessage(data.message || "VFP Console launched successfully.");
      } else {
        setMessage(data.error || "Failed to launch VFP Console.");
      }
    } catch {
      setMessage("Error occurred while launching VFP Console.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleChooseFolder() {
    setMessage("");
    setIsModalOpen(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-sky-200 text-sky-700 bg-white hover:bg-sky-50 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={Boolean(busyAction)}
        onClick={handleLaunchVfp}
        type="button"
      >
        <Terminal size={13} />
        {busyAction === "launch-vfp" ? "Launching..." : "Open VFP Console"}
      </button>
      
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-green-200 text-green-700 bg-white hover:bg-green-50 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={Boolean(busyAction)}
        onClick={() => {
          setMessage("");
          setIsWizardOpen(true);
        }}
        type="button"
      >
        <RefreshCw size={13} />
        Sync Wizard
      </button>

      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={Boolean(busyAction)}
        onClick={() => queueAction("rescan")}
        type="button"
      >
        <Search size={13} />
        {busyAction === "rescan" ? "Queueing..." : "Rescan"}
      </button>

      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={Boolean(busyAction)}
        onClick={() => queueAction("sync-now")}
        type="button"
      >
        <RefreshCw size={13} className={busyAction === "sync-now" ? "animate-spin" : ""} />
        {busyAction === "sync-now" ? "Queueing..." : "Sync Now"}
      </button>

      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={Boolean(busyAction)}
        onClick={handleChooseFolder}
        type="button"
      >
        <FolderOpen size={13} />
        Choose Folder
      </button>

      {message && <span className="text-slate-500 text-xs w-full mt-2 font-medium">{message}</span>}

      <FolderSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPath={currentPath}
        onFolderSelected={(newPath) => {
          setMessage(`Sync folder updated to: ${newPath}`);
          router.refresh();
        }}
      />

      <VfpConfigWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setMessage("Wizard configuration completed successfully!");
          router.refresh();
        }}
        currentDataDir={currentPath}
      />
    </div>
  );
}
