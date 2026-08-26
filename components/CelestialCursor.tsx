"use client";

import React, { useEffect, useRef, useState } from "react";

interface CelestialCursorProps {
  theme?:
    | "morning"
    | "afternoon"
    | "evening"
    | "night"
    | "auto"
    | "peach"
    | "oceanDeep"
    | "sapphire"
    | "cobalt"
    | "midnight"
    | "glacier"
    | "emerald"
    | "velvet"
    | "ember"
    | "mabsolSpecial"
    | "solidObsidian"
    | "solidNavy"
    | "solidZinc"
    | "solidSnow"
    | "solidSky"
    | "custom";
  accentColor?: string;
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

export default function CelestialCursor({ theme = "auto", accentColor }: CelestialCursorProps) {
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
    if (accentColor) {
      return {
        dot: accentColor,
        ringBorder: accentColor,
        ringGlow: `${accentColor}80`,
        sparkles: [accentColor, "#ffffff", "#38bdf8", "#fb923c"],
        particleShape: "circle" as const,
      };
    }
    switch (activeTheme) {
      case "peach":
      case "morning":
        return {
          dot: "#f97316",
          ringBorder: "rgba(249, 115, 22, 0.8)",
          ringGlow: "rgba(251, 146, 60, 0.45)",
          sparkles: ["#fb923c", "#f97316", "#fed7aa", "#ffffff", "#ea580c"],
          particleShape: "circle" as const,
        };
      case "oceanDeep":
        return {
          dot: "#00f2fe",
          ringBorder: "rgba(0, 242, 254, 0.85)",
          ringGlow: "rgba(0, 242, 254, 0.5)",
          sparkles: ["#00f2fe", "#0284c7", "#38bdf8", "#ffffff"],
          particleShape: "diamond" as const,
        };
      case "sapphire":
      case "afternoon":
        return {
          dot: "#0284c7",
          ringBorder: "rgba(2, 132, 199, 0.8)",
          ringGlow: "rgba(2, 132, 199, 0.45)",
          sparkles: ["#38bdf8", "#0284c7", "#bae6fd", "#ffffff"],
          particleShape: "circle" as const,
        };
      case "cobalt":
        return {
          dot: "#3b82f6",
          ringBorder: "rgba(59, 130, 246, 0.85)",
          ringGlow: "rgba(59, 130, 246, 0.5)",
          sparkles: ["#60a5fa", "#3b82f6", "#1d4ed8", "#ffffff"],
          particleShape: "diamond" as const,
        };
      case "midnight":
      case "night":
        return {
          dot: "#818cf8",
          ringBorder: "rgba(129, 140, 248, 0.85)",
          ringGlow: "rgba(99, 102, 241, 0.5)",
          sparkles: ["#a5b4fc", "#818cf8", "#6366f1", "#ffffff"],
          particleShape: "diamond" as const,
        };
      case "glacier":
        return {
          dot: "#06b6d4",
          ringBorder: "rgba(6, 182, 212, 0.8)",
          ringGlow: "rgba(6, 182, 212, 0.45)",
          sparkles: ["#22d3ee", "#06b6d4", "#99f6e4", "#ffffff"],
          particleShape: "circle" as const,
        };
      case "emerald":
      case "evening":
        return {
          dot: "#10b981",
          ringBorder: "rgba(16, 185, 129, 0.8)",
          ringGlow: "rgba(16, 185, 129, 0.45)",
          sparkles: ["#34d399", "#10b981", "#a7f3d0", "#ffffff"],
          particleShape: "diamond" as const,
        };
      case "velvet":
        return {
          dot: "#a855f7",
          ringBorder: "rgba(168, 85, 247, 0.85)",
          ringGlow: "rgba(168, 85, 247, 0.5)",
          sparkles: ["#c084fc", "#a855f7", "#e9d5ff", "#ffffff"],
          particleShape: "diamond" as const,
        };
      case "mabsolSpecial":
        return {
          dot: "#fb8c00",
          ringBorder: "rgba(251, 140, 0, 0.85)",
          ringGlow: "rgba(52, 56, 114, 0.5)",
          sparkles: ["#fb8c00", "#343872", "#ffb74d", "#ffffff"],
          particleShape: "diamond" as const,
        };
      case "ember":
        return {
          dot: "#f43f5e",
          ringBorder: "rgba(244, 63, 94, 0.85)",
          ringGlow: "rgba(244, 63, 94, 0.5)",
          sparkles: ["#fb7185", "#f43f5e", "#fecdd3", "#ffffff"],
          particleShape: "diamond" as const,
        };
      default:
        return {
          dot: "#00f2fe",
          ringBorder: "rgba(99, 102, 241, 0.85)",
          ringGlow: "rgba(0, 242, 254, 0.5)",
          sparkles: ["#00f2fe", "#6366f1", "#a5b4fc", "#ffffff"],
          particleShape: "diamond" as const,
        };
    }
  };

  const isHoveredRef = useRef(false);
  const isClickingRef = useRef(false);
  const isVisibleRef = useRef(false);

  // Sync state for rendering while using refs for 60fps loop
  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    isClickingRef.current = isClicking;
  }, [isClicking]);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    // Disable on touch devices
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
    setMounted(true);

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisibleRef.current) {
        setIsVisible(true);
        isVisibleRef.current = true;
      }

      // Spawn subtle celestial sparkles on move
      if (Math.random() < 0.35) {
        const pal = getThemePalette();
        const colors = pal.sparkles;
        sparklesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 14,
          y: e.clientY + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2 - 0.35,
          size: Math.random() * 2.2 + 1.2,
          alpha: 0.9,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1.0,
          decay: 0.03 + Math.random() * 0.02,
          shape: pal.particleShape,
        });
      }

      // Fast hoverable element check WITHOUT calling getComputedStyle (no layout reflow)
      const target = e.target as HTMLElement | null;
      const hoverTarget = target
        ? (target.closest("button, a, input, select, textarea, [role='button'], .sync-tile, .floating-badge, .capsule-btn, .toggle-visibility, .brand-mark, .link-strong") || null)
        : null;

      if (hoverTarget) {
        if (!isHoveredRef.current) setIsHovered(true);
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
        if (isHoveredRef.current) setIsHovered(false);
        targetSnap.current.snapped = false;
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { passive: true });

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
    window.addEventListener("resize", handleResize, { passive: true });

    // 60FPS Fluid Render Loop
    const render = () => {
      const currentHovered = isHoveredRef.current;
      const currentClicking = isClickingRef.current;

      // 1. Smooth Spring Interpolation (LERP) for Ring Follower
      const targetX = targetSnap.current.snapped
        ? targetSnap.current.x * 0.4 + mousePos.current.x * 0.6
        : mousePos.current.x;
      const targetY = targetSnap.current.snapped
        ? targetSnap.current.y * 0.4 + mousePos.current.y * 0.6
        : mousePos.current.y;

      const lerpFactor = currentHovered ? 0.28 : 0.22;
      ringPos.current.x += (targetX - ringPos.current.x) * lerpFactor;
      ringPos.current.y += (targetY - ringPos.current.y) * lerpFactor;

      // 2. Direct Pin for Dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%) scale(${currentClicking ? 0.65 : 1})`;
      }

      // 3. Transform Outer Ring
      if (ringRef.current) {
        const ringScale = currentClicking ? 0.82 : currentHovered ? 1.48 : 1;
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%) scale(${ringScale})`;
      }

      // 4. Render Canvas Stardust Sparkles
      if (canvasRef.current && sparklesRef.current.length > 0) {
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
  }, [theme]);

  const palette = getThemePalette();

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
