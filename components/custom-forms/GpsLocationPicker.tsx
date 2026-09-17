"use client";

import React, { useState } from "react";
import { FaMapMarkerAlt, FaSpinner, FaExternalLinkAlt, FaCheck } from "react-icons/fa";

interface GpsLocationPickerProps {
  value?: { lat?: number; lng?: number; address?: string; timestamp?: string } | string;
  onChange: (data: any) => void;
  readOnly?: boolean;
}

export default function GpsLocationPicker({
  value,
  onChange,
  readOnly = false,
}: GpsLocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loc = typeof value === "object" && value !== null ? value : null;

  const handleCaptureLocation = () => {
    if (readOnly) return;
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const timestamp = new Date().toISOString();

        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        } catch (e) {
          // fallback to coordinates
        }

        const locData = { lat, lng, address, timestamp };
        onChange(locData);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setErrorMsg(err.message || "Failed to capture GPS location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm shrink-0">
            <FaMapMarkerAlt />
          </div>
          <div>
            {loc && loc.lat ? (
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <FaCheck className="text-emerald-500" /> GPS Stamp Captured
                </span>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {loc.address || `${loc.lat}, ${loc.lng}`}
                </p>
              </div>
            ) : (
              <span className="text-slate-500">No GPS location stamped</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loc && loc.lat && (
            <a
              href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-semibold rounded-lg flex items-center gap-1 transition-all shrink-0"
            >
              Maps <FaExternalLinkAlt className="text-[10px]" />
            </a>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleCaptureLocation}
              disabled={loading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" /> Fetching GPS...
                </>
              ) : (
                <>
                  <FaMapMarkerAlt /> {loc ? "Recapture GPS" : "Stamp My Location"}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {errorMsg && <p className="text-rose-500 text-[11px]">{errorMsg}</p>}
    </div>
  );
}
