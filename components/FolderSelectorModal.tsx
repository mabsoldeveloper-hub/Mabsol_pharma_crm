"use client";

import { useState, useEffect } from "react";
import { FaFolder, FaFolderOpen, FaArrowUp, FaSearch, FaTimes } from "react-icons/fa";

interface FolderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onFolderSelected: (newPath: string) => void;
  title?: string;
  selectOnly?: boolean;
}

export default function FolderSelectorModal({
  isOpen,
  onClose,
  currentPath,
  onFolderSelected,
  title = "Configure VFP Sync Directory",
  selectOnly = false,
}: FolderSelectorModalProps) {
  const [pathInput, setPathInput] = useState("");
  const [folderInput, setFolderInput] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Initialize paths when modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      setFilterText("");
      
      let basePath = "";
      let folderName = "";

      if (currentPath) {
        // Find the last index of slashes (both Unix / and Windows \)
        const lastSlash = Math.max(currentPath.lastIndexOf("/"), currentPath.lastIndexOf("\\"));
        if (lastSlash !== -1 && lastSlash < currentPath.length - 1) {
          basePath = currentPath.substring(0, lastSlash);
          folderName = currentPath.substring(lastSlash + 1);
        } else {
          basePath = currentPath;
          folderName = "";
        }
      } else {
        basePath = "";
        folderName = "";
      }

      setPathInput(basePath);
      setFolderInput(folderName);
      loadFolders(basePath);
    }
  }, [isOpen, currentPath]);

  async function loadFolders(targetPath: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/vfp/browse-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPath }),
      });
      const data = await response.json();

      if (data.success) {
        setFolders(data.folders || []);
        setPathInput(data.currentPath || targetPath);
        setParentPath(data.parentPath);
      } else {
        setError(data.error || "Failed to load folders.");
        setFolders([]);
        setParentPath(null);
      }
    } catch {
      setError("An error occurred while connecting to the server.");
      setFolders([]);
      setParentPath(null);
    } finally {
      setLoading(false);
    }
  }

  const handleGoClick = () => {
    loadFolders(pathInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      loadFolders(pathInput);
    }
  };

  const handleFolderClick = (folderName: string) => {
    setFolderInput(folderName);
  };

  const handleFolderDoubleClick = (folderName: string) => {
    // Append folder name to path input and load folders inside
    const separator = pathInput.endsWith("/") || pathInput.endsWith("\\") ? "" : "\\";
    const newPath = `${pathInput}${separator}${folderName}`;
    setFolderInput("");
    loadFolders(newPath);
  };

  const handleUpClick = () => {
    if (parentPath) {
      setFolderInput("");
      loadFolders(parentPath);
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!pathInput.trim()) {
      setError("Base path is required.");
      return;
    }

    // Combine path and folder cleanly
    const separator = pathInput.endsWith("/") || pathInput.endsWith("\\") ? "" : "\\";
    const fullPath = folderInput.trim()
      ? `${pathInput.trim()}${separator}${folderInput.trim()}`
      : pathInput.trim();

    if (selectOnly) {
      onFolderSelected(fullPath);
      onClose();
      return;
    }

    setLoading(true);
    try {
      const configRes = await fetch("/api/vfp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataDir: fullPath }),
      });
      const configData = await configRes.json();

      if (configData.success) {
        setSuccess("Sync folder configured successfully!");
        onFolderSelected(fullPath);
        // Wait a short moment to show success message before closing
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError(configData.error || "Failed to update configuration.");
      }
    } catch {
      setError("An error occurred while saving the configuration.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredFolders = folders.filter((folder) =>
    folder.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
          
          {/* Modal Header */}
          <div className="modal-header border-bottom px-4 py-3 bg-light d-flex align-items-center justify-content-between">
            <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
              <FaFolderOpen className="text-primary fs-5" />
              {title}
            </h5>
            <button
              type="button"
              className="btn-close shadow-none"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4">
            {error && (
              <div className="alert alert-danger border-0 shadow-sm py-2 px-3 mb-3 small d-flex align-items-center gap-2">
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="alert alert-success border-0 shadow-sm py-2 px-3 mb-3 small d-flex align-items-center gap-2">
                <span>{success}</span>
              </div>
            )}

            {/* Path Form Input */}
            <div className="mb-3">
              <label htmlFor="basePathInput" className="form-label fw-semibold text-secondary small">
                Base Path
              </label>
              <div className="input-group input-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center"
                  onClick={handleUpClick}
                  disabled={!parentPath || loading}
                  title="Go up to parent directory"
                >
                  <FaArrowUp />
                </button>
                <input
                  id="basePathInput"
                  type="text"
                  className="form-control font-monospace text-secondary bg-light"
                  placeholder="e.g. C:\VFPData"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="btn btn-primary px-3 shadow-none"
                  onClick={handleGoClick}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    "Open"
                  )}
                </button>
              </div>
            </div>

            {/* Subfolders Navigation list */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-semibold text-secondary small">Subfolders inside path</span>
                {loading && <span className="spinner-border spinner-border-sm text-primary" style={{ borderWidth: "2px" }}></span>}
              </div>

              <div className="border rounded-3 p-3 bg-light overflow-hidden">
                {/* Search inside the folders */}
                <div className="input-group input-group-sm mb-2 shadow-sm">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <FaSearch size={12} />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-1"
                    placeholder="Filter subfolders..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    disabled={loading || folders.length === 0}
                  />
                  {filterText && (
                    <button
                      className="btn btn-outline-secondary border-start-0"
                      onClick={() => setFilterText("")}
                      type="button"
                    >
                      <FaTimes size={10} />
                    </button>
                  )}
                </div>

                {/* Folders list */}
                <div
                  className="overflow-auto bg-white border rounded-2"
                  style={{ height: "180px" }}
                >
                  {filteredFolders.length === 0 ? (
                    <div className="h-100 d-flex align-items-center justify-content-center text-muted small py-4">
                      {loading ? "Loading subfolders..." : "No folders found in this directory"}
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {filteredFolders.map((folderName) => (
                        <button
                          key={folderName}
                          type="button"
                          className={`list-group-item list-group-item-action py-2 px-3 text-start border-0 d-flex align-items-center gap-2.5 small font-monospace ${
                            folderInput === folderName
                              ? "bg-primary text-white"
                              : "text-secondary"
                          }`}
                          onClick={() => handleFolderClick(folderName)}
                          onDoubleClick={() => handleFolderDoubleClick(folderName)}
                          title="Click to select, Double-click to open"
                        >
                          <FaFolder className={folderInput === folderName ? "text-white" : "text-warning"} />
                          <span className="text-truncate">{folderName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-muted small mt-1.5" style={{ fontSize: "0.7rem" }}>
                  💡 Double-click a folder to navigate down, or select it to set it as target folder.
                </div>
              </div>
            </div>

            {/* Folder Form Input */}
            <div>
              <label htmlFor="folderNameInput" className="form-label fw-semibold text-secondary small">
                Target Folder Name
              </label>
              <input
                id="folderNameInput"
                type="text"
                className="form-control form-control-sm font-monospace text-secondary"
                placeholder="Folder name (leave blank to select Base Path directory)"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer border-top px-4 py-3 bg-light">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm px-4 fw-semibold"
              onClick={handleSave}
              disabled={loading || !pathInput.trim()}
            >
              {loading ? "Saving..." : "Save Config"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
