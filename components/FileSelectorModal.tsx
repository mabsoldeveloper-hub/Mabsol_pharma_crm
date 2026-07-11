"use client";

import React, { useState, useEffect } from "react";
import { 
  Folder, 
  FileCode, 
  Terminal, 
  ChevronRight, 
  Search, 
  ArrowUp, 
  HardDrive, 
  X, 
  FolderOpen,
  Loader2,
  Check
} from "lucide-react";

interface FileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  title: string;
  filterType: "exe" | "prg" | "dir";
  initialPath?: string;
}

export default function FileSelectorModal({
  isOpen,
  onClose,
  onSelect,
  title,
  filterType,
  initialPath = ""
}: FileSelectorModalProps) {
  const [currentDir, setCurrentDir] = useState("");
  const [parentDir, setParentDir] = useState<string | null>(null);
  const [drives, setDrives] = useState<string[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load directories and files
  const browsePath = async (dirPath: string) => {
    setLoading(true);
    setError("");
    setSelectedItem(null);
    try {
      const typeParam = filterType === "dir" ? "" : filterType;
      const response = await fetch(
        `/api/vfp/browse?dir=${encodeURIComponent(dirPath)}&type=${typeParam}`
      );
      const data = await response.json();
      if (data.success) {
        setCurrentDir(data.currentDir);
        setParentDir(data.parentDir);
        setDrives(data.drives || []);
        setDirectories(data.directories || []);
        setFiles(data.files || []);
      } else {
        setError(data.error || "Failed to load directory.");
      }
    } catch {
      setError("An error occurred while connecting to the file browser.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSearchQuery("");
      // Determine initial path to start at
      if (initialPath) {
        // If initial path is a file, get directory part
        let startDir = initialPath;
        if (filterType !== "dir" && (startDir.endsWith(".exe") || startDir.endsWith(".prg"))) {
          const lastSlash = Math.max(startDir.lastIndexOf("/"), startDir.lastIndexOf("\\"));
          if (lastSlash !== -1) {
            startDir = startDir.substring(0, lastSlash);
          }
        }
        browsePath(startDir);
      } else {
        // Fetch drives list
        browsePath("");
      }
    }
  }, [isOpen, filterType, initialPath]);

  if (!isOpen) return null;

  const handleSelectItem = (name: string) => {
    setSelectedItem(name);
  };

  const handleDoubleClickDirectory = (dirName: string) => {
    const separator = currentDir.endsWith("\\") || currentDir.endsWith("/") ? "" : "\\";
    browsePath(`${currentDir}${separator}${dirName}`);
  };

  const handleNavigateUp = () => {
    if (parentDir) {
      browsePath(parentDir);
    } else {
      browsePath("");
    }
  };

  const handleConfirmSelect = () => {
    if (filterType === "dir") {
      if (selectedItem) {
        const separator = currentDir.endsWith("\\") || currentDir.endsWith("/") ? "" : "\\";
        onSelect(`${currentDir}${separator}${selectedItem}`);
      } else {
        onSelect(currentDir);
      }
      onClose();
    } else if (selectedItem) {
      const separator = currentDir.endsWith("\\") || currentDir.endsWith("/") ? "" : "\\";
      onSelect(`${currentDir}${separator}${selectedItem}`);
      onClose();
    }
  };

  const filteredDirectories = directories.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(f => 
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl h-[560px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-850 dark:text-white text-base flex items-center gap-2">
              {filterType === "dir" ? <FolderOpen className="text-blue-500 w-5 h-5" /> : <Terminal className="text-indigo-500 w-5 h-5" />}
              {title}
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
              Browse your server filesystem to configure VFP paths
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Path Navigation Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
          <button
            onClick={handleNavigateUp}
            disabled={!currentDir || loading}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-500 transition-colors shrink-0"
            title="Go to parent directory"
          >
            <ArrowUp size={14} />
          </button>
          
          <div className="flex-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850/60 px-3 py-1.5 rounded-xl truncate">
            {currentDir || "Root (List of Drives)"}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col p-6 bg-slate-50/30 dark:bg-slate-950/20">
          {error && (
            <div className="mb-4 p-3 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Search Box */}
          {currentDir && (
            <div className="relative mb-3 shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="Filter contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Browser List Grid */}
          <div className="flex-1 min-h-0 border border-slate-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2.5 text-slate-400">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="text-xs font-semibold">Scanning directory...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {/* Drives List */}
                {!currentDir && drives.map(drive => (
                  <button
                    key={drive}
                    onClick={() => browsePath(drive)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <HardDrive className="text-slate-400 dark:text-slate-500" size={16} />
                    <span>Local Disk ({drive})</span>
                    <ChevronRight size={12} className="ms-auto text-slate-400" />
                  </button>
                ))}

                {/* Directories List */}
                {filteredDirectories.map(dir => (
                  <button
                    key={dir}
                    onClick={() => handleSelectItem(dir)}
                    onDoubleClick={() => handleDoubleClickDirectory(dir)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs transition-colors ${
                      selectedItem === dir && filterType === "dir"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-medium"
                    }`}
                  >
                    <Folder className={selectedItem === dir && filterType === "dir" ? "text-blue-500" : "text-amber-500"} size={16} />
                    <span className="truncate flex-1">{dir}</span>
                    <span className="text-[10px] text-slate-450 font-normal opacity-0 group-hover:opacity-100">Double-click to enter</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                ))}

                {/* Files List */}
                {filterType !== "dir" && filteredFiles.map(file => (
                  <button
                    key={file}
                    onClick={() => handleSelectItem(file)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs transition-colors ${
                      selectedItem === file
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-medium"
                    }`}
                  >
                    {filterType === "exe" ? (
                      <Terminal className={selectedItem === file ? "text-indigo-500" : "text-indigo-400"} size={16} />
                    ) : (
                      <FileCode className={selectedItem === file ? "text-teal-500" : "text-teal-400"} size={16} />
                    )}
                    <span className="truncate flex-1">{file}</span>
                    {selectedItem === file && <Check size={12} className="text-indigo-500" />}
                  </button>
                ))}

                {/* Empty State */}
                {currentDir && filteredDirectories.length === 0 && filteredFiles.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                    <span className="text-xs font-semibold">This directory is empty</span>
                    <span className="text-[10px] text-slate-400">No matching directories or files found</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[280px]">
            {selectedItem 
              ? `Selected: ${selectedItem}`
              : filterType === "dir" ? "Select the current folder or choose one above" : "Choose a file to select"
            }
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelect}
              disabled={loading || (filterType !== "dir" && !selectedItem)}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Selection
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
