"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Folder, 
  FolderOpen,
  FileCode, 
  Terminal, 
  ChevronRight, 
  Search, 
  ArrowUp, 
  HardDrive, 
  X, 
  Loader2,
  Check,
  Database
} from "lucide-react";

interface FileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  title: string;
  filterType: "exe" | "prg" | "dir" | "dbf";
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
  const crumbTrackRef = useRef<HTMLDivElement>(null);

  // Auto-scroll breadcrumbs when currentDir changes
  useEffect(() => {
    if (crumbTrackRef.current) {
      crumbTrackRef.current.scrollLeft = crumbTrackRef.current.scrollWidth;
    }
  }, [currentDir]);

  // Load directories and files
  const browsePath = async (dirPath: string) => {
    setLoading(true);
    setError("");
    setSelectedItem(null);
    try {
      const typeParam = filterType === "dir" ? "" : filterType;
      const response = await fetch(
        `/api/mabsolcrmsync/browse?dir=${encodeURIComponent(dirPath)}&type=${typeParam}`
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

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setError("");
      setSearchQuery("");
      let startDir = initialPath || "";
      if (filterType !== "dir" && (startDir.endsWith(".exe") || startDir.endsWith(".prg") || startDir.endsWith(".dbf"))) {
        const lastSlash = Math.max(startDir.lastIndexOf("/"), startDir.lastIndexOf("\\"));
        if (lastSlash !== -1) {
          startDir = startDir.substring(0, lastSlash);
        }
      }
      browsePath(startDir);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

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

  // Split current directory into clickable breadcrumbs
  const getCrumbs = () => {
    const crumbs = [{ name: "Root", path: "" }];
    if (!currentDir) return crumbs;

    const parts = currentDir.split(/[\\/]/).filter(Boolean);
    let tempPath = "";

    parts.forEach((part, index) => {
      if (index === 0) {
        tempPath = part;
        if (tempPath.endsWith(":")) {
          tempPath += "\\";
        }
      } else {
        const separator = tempPath.endsWith("\\") || tempPath.endsWith("/") ? "" : "\\";
        tempPath = `${tempPath}${separator}${part}`;
      }
      crumbs.push({ name: part, path: tempPath });
    });
    return crumbs;
  };

  const getSelectedFullPath = () => {
    if (!selectedItem) {
      return filterType === "dir" ? currentDir || "none" : "none";
    }
    const separator = currentDir.endsWith("\\") || currentDir.endsWith("/") ? "" : "\\";
    return currentDir ? `${currentDir}${separator}${selectedItem}` : selectedItem;
  };

  if (!isOpen) return null;

  const filteredDirectories = directories.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(f => 
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const crumbs = getCrumbs();
  const selectedFullPath = getSelectedFullPath();

  // Header icon selector based on filter type
  let HeaderIcon = FolderOpen;
  if (filterType === "dbf") {
    HeaderIcon = Database;
  } else if (filterType === "exe") {
    HeaderIcon = Terminal;
  }

  return (
    <div className="fixed inset-0 bg-[#16181D]/40 flex items-center justify-center p-6 z-[1050] backdrop-blur-xs">
      <div className="bg-white w-full max-w-[480px] rounded-[10px] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-[#E4E6EB]">
        
        {/* Header */}
        <div className="flex items-start justify-between p-[20px_22px_16px] gap-[14px] bg-white shrink-0">
          <div className="flex gap-3 items-start">
            <div className="w-[34px] h-[34px] rounded-[8px] border border-[#E4E6EB] bg-[#F7F8FA] text-[#63676F] flex items-center justify-center shrink-0">
              <HeaderIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sans text-base font-bold text-[#16181D] m-0 mb-[3px] tracking-[-0.01em] leading-snug">
                {title}
              </h2>
              <p className="text-[12.5px] text-[#9297A1] m-0 leading-normal">
                Browse your server filesystem to configure VFP paths
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="w-7 h-7 rounded-md border-0 bg-transparent text-[#9297A1] cursor-pointer flex items-center justify-center shrink-0 hover:bg-[#F7F8FA] hover:text-[#16181D] transition-colors mt-0.5"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 p-[0_22px_14px] shrink-0">
          <button
            type="button"
            className="w-[30px] h-[30px] rounded-[7px] border border-[#E4E6EB] bg-white flex items-center justify-center cursor-pointer text-[#63676F] shrink-0 hover:bg-[#F7F8FA] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            onClick={handleNavigateUp}
            disabled={!currentDir || loading}
            title="Up one level"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          
          <div ref={crumbTrackRef} className="flex-1 min-w-0 flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E4E6EB] rounded-[7px] p-[8px_12px] overflow-x-auto whitespace-nowrap scrollbar-none">
            {crumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className={`text-[12.5px] font-medium cursor-pointer px-[3px] py-[2px] rounded font-mono transition-colors focus:outline-none ${
                    idx === crumbs.length - 1 
                      ? "text-[#16181D] font-bold pointer-events-none" 
                      : "text-[#9297A1] hover:text-[#16181D]"
                  }`}
                  onClick={() => browsePath(crumb.path)}
                >
                  {crumb.name}
                </button>
                {idx < crumbs.length - 1 && (
                  <span className="text-[#D4D7DE] text-[12px] select-none font-mono">/</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Filter Input */}
        {currentDir && (
          <div className="px-[22px] pb-[14px] shrink-0">
            <div className="flex items-center gap-2.5 bg-[#F7F8FA] border border-[#E4E6EB] rounded-[7px] p-[9px_12px]">
              <Search className="w-3.5 h-3.5 text-[#9297A1] shrink-0" />
              <input
                type="text"
                className="w-full text-xs bg-transparent outline-none border-none text-[#16181D] placeholder-[#9297A1]"
                placeholder="Filter contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="p-0.5 text-[#9297A1] hover:text-[#16181D] transition-colors focus:outline-none"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Banner (Errors) */}
        {error && (
          <div className="mx-[22px] mb-[14px] flex items-center gap-2.5 bg-[#FCEBEA] border border-[#F3C9C6] rounded-[7px] p-[10px_13px] text-[12.5px] text-[#C0332A] font-medium animate-in fade-in duration-100 shrink-0">
            <span>{error}</span>
          </div>
        )}

        {/* Contents List */}
        <div className="mx-[22px] mb-[22px] border border-[#E4E6EB] rounded-[9px] flex-1 min-h-[180px] max-h-[260px] overflow-y-auto bg-white">
          {loading ? (
            <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-[#9297A1] gap-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-[#3457D5]" />
              <span className="text-xs font-semibold">Scanning directory...</span>
            </div>
          ) : !currentDir && drives.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-[36px_20px] text-center text-[#9297A1] min-h-[180px]">
              <HardDrive className="w-7 h-7 mb-2 text-[#D4D7DE]" />
              <div className="text-[13px] font-semibold text-[#63676F] mb-0.5">No drives available</div>
              <div className="text-[11.5px] text-[#9297A1]">Could not scan standard drives on the host.</div>
            </div>
          ) : currentDir && filteredDirectories.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-[36px_20px] text-center text-[#9297A1] min-h-[180px]">
              <Folder className="w-7 h-7 mb-2 text-[#D4D7DE]" />
              <div className="text-[13px] font-semibold text-[#63676F] mb-0.5">No items found</div>
              <div className="text-[11.5px] text-[#9297A1]">This location is empty or matches no filter.</div>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E6EB]">
              {/* Render Drives (Only when at root) */}
              {!currentDir && drives.map((drive) => {
                const isSelected = selectedItem === drive;
                return (
                  <div
                    key={drive}
                    className={`flex items-center gap-[12px] p-[12px_14px] cursor-pointer transition-colors group ${
                      isSelected ? "bg-[#EEF1FD]" : "hover:bg-[#F7F8FA]"
                    }`}
                    onClick={() => handleSelectItem(drive)}
                    onDoubleClick={() => browsePath(drive)}
                  >
                    <div className={`w-[28px] h-[28px] rounded-[6px] flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-white text-[#3457D5]" : "bg-[#F7F8FA] text-[#9297A1]"
                    }`}>
                      <HardDrive className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-[#16181D] truncate font-mono">
                        Local Disk ({drive})
                      </div>
                      <div className="text-[11.5px] text-[#9297A1] font-mono">System Drive</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9297A1] shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </div>
                );
              })}

              {/* Render Directories */}
              {filteredDirectories.map((dir) => {
                const isSelected = selectedItem === dir;
                return (
                  <div
                    key={dir}
                    className={`flex items-center gap-[12px] p-[12px_14px] cursor-pointer transition-colors group ${
                      isSelected ? "bg-[#EEF1FD]" : "hover:bg-[#F7F8FA]"
                    }`}
                    onClick={() => {
                      if (filterType === "dir") {
                        handleSelectItem(dir);
                      } else {
                        handleDoubleClickDirectory(dir);
                      }
                    }}
                    onDoubleClick={() => handleDoubleClickDirectory(dir)}
                  >
                    <div className={`w-[28px] h-[28px] rounded-[6px] flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-white text-[#3457D5]" : "bg-[#F7F8FA] text-[#9297A1]"
                    }`}>
                      <Folder className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-[#16181D] truncate font-sans">
                        {dir}
                      </div>
                      <div className="text-[11.5px] text-[#9297A1] font-sans">Folder</div>
                    </div>
                    {filterType === "dir" ? (
                      <Check className={`w-3.5 h-3.5 text-[#3457D5] shrink-0 ml-auto transition-all ${
                        isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      }`} />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#9297A1] shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                );
              })}

              {/* Render Files */}
              {filterType !== "dir" && filteredFiles.map((file) => {
                const isSelected = selectedItem === file;
                
                let FileIcon = FileCode;
                let metaText = "File";
                let iconColor = "text-[#9297A1]";
                
                if (filterType === "dbf") {
                  FileIcon = Database;
                  metaText = "FoxPro Table";
                } else if (filterType === "exe") {
                  FileIcon = Terminal;
                  metaText = "Executable";
                }

                return (
                  <div
                    key={file}
                    className={`flex items-center gap-[12px] p-[12px_14px] cursor-pointer transition-colors group ${
                      isSelected ? "bg-[#EEF1FD]" : "hover:bg-[#F7F8FA]"
                    }`}
                    onClick={() => handleSelectItem(file)}
                  >
                    <div className={`w-[28px] h-[28px] rounded-[6px] flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-white text-[#3457D5]" : `bg-[#F7F8FA] ${iconColor}`
                    }`}>
                      <FileIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-[#16181D] truncate font-mono">
                        {file}
                      </div>
                      <div className="text-[11.5px] text-[#9297A1] font-sans">{metaText}</div>
                    </div>
                    <Check className={`w-3.5 h-3.5 text-[#3457D5] shrink-0 ml-auto transition-all ${
                      isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                    }`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-[15px_22px] border-t border-[#E4E6EB] bg-white shrink-0">
          <div className="text-[12px] text-[#9297A1] truncate max-w-[220px]">
            Selected: <span className="text-[#63676F] font-mono font-medium ml-1" title={selectedFullPath}>{selectedFullPath}</span>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button
              type="button"
              className="text-[13px] font-semibold rounded-[7px] px-[16px] py-[9px] cursor-pointer border border-[#D4D7DE] bg-white text-[#16181D] hover:bg-[#F7F8FA] active:scale-[0.98] transition-all disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-[13px] font-semibold rounded-[7px] px-[16px] py-[9px] cursor-pointer border border-[#3457D5] bg-[#3457D5] text-white hover:bg-[#2C48B8] active:scale-[0.98] transition-all disabled:bg-[#B7C1EE] disabled:border-[#B7C1EE] disabled:cursor-not-allowed disabled:active:scale-100"
              onClick={handleConfirmSelect}
              disabled={loading || (filterType !== "dir" && !selectedItem)}
            >
              Confirm selection
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
