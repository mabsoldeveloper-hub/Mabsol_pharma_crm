"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  exiting?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, message, type, duration };

      // Append new toast to stack (keep max 5 active)
      setToasts((prev) => {
        const active = prev.filter((t) => !t.exiting);
        if (active.length >= 5) {
          const oldestId = active[0].id;
          return [
            ...prev.map((t) => (t.id === oldestId ? { ...t, exiting: true } : t)),
            newToast,
          ];
        }
        return [...prev, newToast];
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (msg: string, dur?: number) => showToast(msg, "success", dur ?? 3000),
    error: (msg: string, dur?: number) => showToast(msg, "error", dur ?? 3000),
    info: (msg: string, dur?: number) => showToast(msg, "info", dur ?? 3000),
    warning: (msg: string, dur?: number) => showToast(msg, "warning", dur ?? 3000),
  };

  // Active non-exiting toasts rendered with newest first (index 0)
  const activeToasts = [...toasts].reverse();

  return (
    <ToastContext.Provider value={{ showToast, toast, removeToast }}>
      {children}

      {/* Floating Stacked Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col max-w-sm w-full pointer-events-none px-4 sm:px-0 toast-stack-container">
        {activeToasts.map((item, idx) => {
          const stackZIndex = activeToasts.length - idx;
          const stackOffsetY = idx * -14;
          const stackScale = Math.max(0.85, 1 - idx * 0.04);

          return (
            <div
              key={item.id}
              style={{
                zIndex: stackZIndex,
                transform: `translateY(${stackOffsetY}px) scale(${stackScale})`,
                opacity: item.exiting ? 0 : Math.max(0.4, 1 - idx * 0.15),
              }}
              className={`toast-stack-item pointer-events-auto flex items-center gap-2.5 px-3.5 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 ${
                item.exiting ? "toast-exit-anim" : "toast-enter-anim"
              } ${
                item.type === "success"
                  ? "bg-emerald-50/95 border-emerald-200/90 text-emerald-900 shadow-emerald-900/10"
                  : item.type === "error"
                  ? "bg-rose-50/95 border-rose-200/90 text-rose-900 shadow-rose-900/10"
                  : item.type === "warning"
                  ? "bg-amber-50/95 border-amber-200/90 text-amber-900 shadow-amber-900/10"
                  : "bg-sky-50/95 border-sky-200/90 text-sky-900 shadow-sky-900/10"
              }`}
            >
              <div className="shrink-0">
                {item.type === "success" && (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                )}
                {item.type === "error" && (
                  <AlertCircle size={16} className="text-rose-600" />
                )}
                {item.type === "warning" && (
                  <AlertTriangle size={16} className="text-amber-600" />
                )}
                {item.type === "info" && (
                  <Info size={16} className="text-sky-600" />
                )}
              </div>

              <div className="flex-1 text-xs font-semibold leading-snug break-words">
                {item.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="shrink-0 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
