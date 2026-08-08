"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { FaEraser, FaCheck, FaSignature } from "react-icons/fa";

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  readOnly?: boolean;
}

export default function SignaturePad({
  value,
  onChange,
  readOnly = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(!!value);

  // ── Helper: get canvas-relative coordinates accounting for scale ──
  const getPos = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      // Scale factor: canvas internal size vs displayed CSS size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // ── Load existing signature image onto canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (value && value.startsWith("data:")) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
      };
      img.src = value;
    } else if (!value) {
      // Clear canvas when value is reset
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  }, [value]);

  // ── Drawing handlers ──
  const startDrawing = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (readOnly) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      isDrawingRef.current = true;
      const pos = getPos(e);
      lastPosRef.current = pos;

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [readOnly, getPos]
  );

  const draw = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawingRef.current || readOnly) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pos = getPos(e);
      const last = lastPosRef.current || pos;

      // Smooth quadratic bezier between points
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);

      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e293b"; // slate-800 - visible on white canvas
      ctx.stroke();

      lastPosRef.current = pos;

      if (!hasSignature) setHasSignature(true);
    },
    [readOnly, getPos, hasSignature]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;

    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [onChange, hasSignature]);

  const clearCanvas = useCallback(() => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onChange("");
    }
  }, [readOnly, onChange]);

  return (
    <div className="space-y-2">
      {/* Canvas Container */}
      <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-white shadow-inner transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
        <canvas
          ref={canvasRef}
          width={900}
          height={280}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-36 touch-none select-none block ${
            readOnly ? "cursor-not-allowed opacity-75" : "cursor-crosshair"
          }`}
          style={{ background: "white" }}
        />

        {/* Placeholder text */}
        {!hasSignature && !readOnly && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1.5">
            <FaSignature className="text-2xl text-slate-200" />
            <span className="text-xs text-slate-300 font-medium select-none">
              Draw your signature here
            </span>
          </div>
        )}

        {/* ReadOnly overlay */}
        {readOnly && !hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-xs text-slate-400 italic">No signature provided</span>
          </div>
        )}
      </div>

      {/* Status & Controls */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <span className="text-xs flex items-center gap-1.5">
            {hasSignature ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg">
                <FaCheck className="text-[10px]" /> Signature Recorded
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">
                Use mouse or finger to draw your signature above
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={clearCanvas}
            disabled={!hasSignature}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 rounded-lg flex items-center gap-1.5 font-medium text-xs transition-all disabled:opacity-30"
          >
            <FaEraser className="text-[10px]" /> Clear Signature
          </button>
        </div>
      )}
    </div>
  );
}
