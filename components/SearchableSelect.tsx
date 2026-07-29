"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaSearch, FaChevronDown, FaTimes, FaCheck } from "react-icons/fa";

export interface OptionItem {
    value: string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: OptionItem[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option...",
    className = "",
    disabled = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Update floating menu position relative to trigger button
    const updateCoords = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 220), // Minimum 220px width for readability
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener("scroll", updateCoords, true);
            window.addEventListener("resize", updateCoords);
        }
        return () => {
            window.removeEventListener("scroll", updateCoords, true);
            window.removeEventListener("resize", updateCoords);
        };
    }, [isOpen, updateCoords]);

    // Selected item label lookup
    const selectedOption = options.find((opt) => String(opt.value) === String(value));

    // Filter options by search query
    const filteredOptions = options.filter((opt) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            opt.label.toLowerCase().includes(q) ||
            (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
            opt.value.toLowerCase().includes(q)
        );
    });

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                // Check if target is inside portal menu
                const portalElement = document.getElementById("searchable-select-portal-menu");
                if (portalElement && portalElement.contains(e.target as Node)) {
                    return;
                }
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setSearchQuery("");
        }
    }, [isOpen]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery("");
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!isOpen) updateCoords();
                    setIsOpen((prev) => !prev);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border transition-all text-left ${
                    isOpen
                        ? "border-rose-500 ring-2 ring-rose-500/20 bg-white dark:bg-slate-900"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
                <span className="truncate pr-2">
                    {selectedOption ? (
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {selectedOption.label}{" "}
                            {selectedOption.subLabel && (
                                <span className="font-normal text-slate-400">
                                    ({selectedOption.subLabel})
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                </span>
                <FaChevronDown
                    size={10}
                    className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? "rotate-180 text-rose-500" : ""
                    }`}
                />
            </button>

            {/* Dropdown Floating Menu Portal (renders on document.body with z-[99999] so it NEVER clips or hides) */}
            {isOpen && mounted && createPortal(
                <div
                    id="searchable-select-portal-menu"
                    style={{
                        position: "fixed",
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        zIndex: 99999,
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]"
                >
                    {/* Live Search Input */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-xs relative flex items-center">
                        <FaSearch size={11} className="absolute left-4 text-slate-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Type to search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setIsOpen(false);
                            }}
                            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <FaTimes size={10} />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                                No matching results found.
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = String(opt.value) === String(value);
                                return (
                                    <div
                                        key={`${opt.value}-${idx}`}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition ${
                                            isSelected
                                                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold"
                                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                        }`}
                                    >
                                        <div className="truncate pr-2">
                                            <span>{opt.label}</span>
                                            {opt.subLabel && (
                                                <span className="text-[10px] text-slate-400 block font-normal truncate">
                                                    {opt.subLabel}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <FaCheck size={10} className="text-rose-500 flex-shrink-0" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
