"use client";

import React, { useEffect, useRef, useState } from "react";

interface CelestialCursorProps {
  theme?: "morning" | "afternoon" | "evening" | "night" | "auto";
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  decay: number;
  shape: "circle" | "diamond";
}

export default function CelestialCursor({ theme = "auto" }: CelestialCursorProps) {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const targetSnap = useRef<{ x: number; y: number; width: number; height: number; snapped: boolean }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    snapped: false,
  });

  const sparklesRef = useRef<Sparkle[]>([]);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determine current active celestial theme
  const getActiveTheme = () => {
    if (theme !== "auto") return theme;
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 20) return "evening";
    return "night";
  };

  const activeTheme = getActiveTheme();

  // Get theme-specific visual palette
  const getThemePalette = () => {
    switch (activeTheme) {
      case "morning":
        return {
          dot: "#f59e0b",
          ringBorder: "rgba(245, 158, 11, 0.75)",
          ringGlow: "rgba(251, 191, 36, 0.4)",
          sparkles: ["#fbbf24", "#f59e0b", "#fde68a", "#ffffff", "#ea580c"],
          particleShape: "circle" as const,
        };
      case "afternoon":
        return {
          dot: "#f97316",
          ringBorder: "rgba(249, 115, 22, 0.8)",
          ringGlow: "rgba(249, 115, 22, 0.45)",
          sparkles: ["#f97316", "#fb923c", "#fed7aa", "#ffffff", "#0284c7"],
          particleShape: "circle" as const,
        };
      case "evening":
        return {
          dot: "#f43f5e",
          ringBorder: "rgba(244, 63, 94, 0.8)",
          ringGlow: "rgba(244, 63, 94, 0.45)",
          sparkles: ["#f43f5e", "#fb7185", "#fecdd3", "#ffffff", "#a855f7"],
          particleShape: "diamond" as const,
        };
      case "night":
      default:
        return {
          dot: "#00f2fe",
          ringBorder: "rgba(99, 102, 241, 0.85)",
          ringGlow: "rgba(0, 242, 254, 0.5)",
          sparkles: ["#00f2fe", "#6366f1", "#a5b4fc", "#ffffff", "#38bdf8"],
          particleShape: "diamond" as const,
        };
    }
  };

  const palette = getThemePalette();

  useEffect(() => {
    // Disable on touch devices
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
    setMounted(true);

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      // Spawn subtle celestial sparkles on move
      if (Math.random() < 0.4) {
        const pal = getThemePalette();
        const colors = pal.sparkles;
        sparklesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 14,
          y: e.clientY + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.45,
          size: Math.random() * 2.4 + 1.4,
          alpha: 0.95,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1.0,
          decay: 0.024 + Math.random() * 0.015,
          shape: pal.particleShape,
        });
      }

      // Check for hoverable elements
      const target = e.target as HTMLElement | null;
      const hoverTarget = target
        ? (target.closest("button") ||
            target.closest("a") ||
            target.closest("input") ||
            target.closest(".sync-tile") ||
            target.closest(".floating-badge") ||
            target.closest(".capsule-btn") ||
            target.closest(".toggle-visibility") ||
            target.closest(".brand-mark") ||
            (window.getComputedStyle(target).cursor === "pointer" ? target : null))
        : null;

      if (hoverTarget) {
        setIsHovered(true);
        const rect = (hoverTarget as HTMLElement).getBoundingClientRect();
        // Magnet snapping for small interactive items
        if (rect.width < 140 && rect.height < 60) {
          targetSnap.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
            snapped: true,
          };
        } else {
          targetSnap.current.snapped = false;
        }
      } else {
        setIsHovered(false);
        targetSnap.current.snapped = false;
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Canvas setup for particle sparkles
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    // 60FPS Fluid Render Loop
    const render = () => {
      // 1. Smooth Spring Interpolation (LERP) for Ring Follower
      const targetX = targetSnap.current.snapped
        ? targetSnap.current.x * 0.4 + mousePos.current.x * 0.6
        : mousePos.current.x;
      const targetY = targetSnap.current.snapped
        ? targetSnap.current.y * 0.4 + mousePos.current.y * 0.6
        : mousePos.current.y;

      const lerpFactor = isHovered ? 0.24 : 0.18;
      ringPos.current.x += (targetX - ringPos.current.x) * lerpFactor;
      ringPos.current.y += (targetY - ringPos.current.y) * lerpFactor;

      // 2. Direct Pin for Dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%) scale(${isClicking ? 0.65 : 1})`;
      }

      // 3. Transform Outer Ring
      if (ringRef.current) {
        const ringScale = isClicking ? 0.82 : isHovered ? 1.48 : 1;
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%) scale(${ringScale})`;
      }

      // 4. Render Canvas Stardust Sparkles
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          for (let i = sparklesRef.current.length - 1; i >= 0; i--) {
            const s = sparklesRef.current[i];
            s.x += s.vx;
            s.y += s.vy;
            s.alpha -= s.decay;

            if (s.alpha <= 0) {
              sparklesRef.current.splice(i, 1);
              continue;
            }

            ctx.save();
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.alpha;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 8;

            if (s.shape === "diamond") {
              ctx.translate(s.x, s.y);
              ctx.beginPath();
              ctx.moveTo(0, -s.size);
              ctx.lineTo(s.size * 0.8, 0);
              ctx.lineTo(0, s.size);
              ctx.lineTo(-s.size * 0.8, 0);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isHovered, isClicking, isVisible, activeTheme]);

  if (!mounted) return null;

  return (
    <div className={`celestial-cursor-container ${isVisible ? "visible" : "hidden"}`} aria-hidden="true">
      {/* Canvas for Particle Stardust Trail */}
      <canvas ref={canvasRef} className="celestial-cursor-canvas" />

      {/* Inner Precision Light Core */}
      <div
        ref={dotRef}
        className="celestial-cursor-dot"
        style={{
          backgroundColor: palette.dot,
          boxShadow: `0 0 10px ${palette.dot}, 0 0 4px #ffffff`,
        }}
      />

      {/* Outer Liquid Magnetic Target Ring */}
      <div
        ref={ringRef}
        className={`celestial-cursor-ring ${isHovered ? "hovered" : ""}`}
        style={{
          borderColor: palette.ringBorder,
          boxShadow: `0 0 18px ${palette.ringGlow}, inset 0 0 8px ${palette.ringGlow}`,
        }}
      >
        {/* Dynamic Celestial Micro Crosshair Reticle Spikes */}
        <span className="reticle-notch reticle-top" style={{ backgroundColor: palette.dot }} />
        <span className="reticle-notch reticle-bottom" style={{ backgroundColor: palette.dot }} />
        <span className="reticle-notch reticle-left" style={{ backgroundColor: palette.dot }} />
        <span className="reticle-notch reticle-right" style={{ backgroundColor: palette.dot }} />
      </div>
    </div>
  );
}
