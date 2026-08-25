"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  layer: number;
  color: string;
  glowColor: string;
  pulsePhase: number;
  pulseSpeed: number;
  driftPhase: number;
  depthZ: number; // 3D depth field (0.3 to 1.0)
}

interface BenzeneStructure {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  tiltAngleX: number;
  tiltAngleY: number;
  vTiltX: number;
  vTiltY: number;
  color: string;
  glowColor: string;
  opacity: number;
  orbitAngle: number;
  orbitSpeed: number;
  depthZ: number;
}

interface RadarScope {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  sweepSpeed: number;
  color: string;
  opacity: number;
  blips: { angle: number; dist: number; opacity: number }[];
}

interface DonutChart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  rotSpeed: number;
  segments: { percent: number; color: string }[];
  opacity: number;
  label: string;
}

interface TrendWave {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  phase: number;
  phaseSpeed: number;
  color: string;
  opacity: number;
  label: string;
}

interface PulsePacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
  trailLength: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  speed: number;
  color: string;
}

// Saturated, Rich Warm Peach, Coral Flame, Golden Amber & Sky Azure Palette
const PALETTE = [
  { main: "#f97316", glow: "rgba(249, 115, 22, 0.65)" },   // Vibrant Warm Peach
  { main: "#fb923c", glow: "rgba(251, 146, 60, 0.6)" },   // Soft Apricot
  { main: "#ea580c", glow: "rgba(234, 88, 12, 0.7)" },    // Deep Sunset Peach
  { main: "#e11d48", glow: "rgba(225, 29, 72, 0.55)" },   // Coral Rose
  { main: "#0284c7", glow: "rgba(2, 132, 199, 0.6)" },    // Sky Azure
  { main: "#6366f1", glow: "rgba(99, 102, 241, 0.55)" },  // Soft Indigo
  { main: "#10b981", glow: "rgba(16, 185, 129, 0.6)" },   // Bio Emerald
];

interface PharmaBackgroundCanvasProps {
  accentColor?: string;
}

export default function PharmaBackgroundCanvas({ accentColor }: PharmaBackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 260,
      isHovered: false,
      reticleAngle: 0,
    };

    let nodes: Node[] = [];
    let benzeneRings: BenzeneStructure[] = [];
    let radars: RadarScope[] = [];
    let donutCharts: DonutChart[] = [];
    let trendWaves: TrendWave[] = [];
    let pulses: PulsePacket[] = [];
    let shockwaves: Shockwave[] = [];
    let animationFrameId: number;
    let lastTime = performance.now();

    function initElements() {
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const nodeCount = isMobile ? 36 : isTablet ? 60 : 88;
      const ringCount = isMobile ? 3 : isTablet ? 5 : 8;
      const radarCount = isMobile ? 1 : 2;
      const donutCount = isMobile ? 1 : 3;
      const waveCount = isMobile ? 1 : 2;

      const activePalette = accentColor
        ? [{ main: accentColor, glow: `${accentColor}99` }, ...PALETTE.slice(1)]
        : PALETTE;

      // 1. Molecular Nodes with 3D Depth-of-Field
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const item = activePalette[Math.floor(Math.random() * activePalette.length)];
        const layer = Math.random() < 0.35 ? 0 : Math.random() < 0.75 ? 1 : 2;
        const depthZ = layer === 0 ? 0.45 : layer === 1 ? 0.75 : 1.0;
        const baseR = (layer === 0 ? 1.6 : layer === 1 ? 2.4 : 3.4) * depthZ;
        const r = baseR + Math.random() * 0.8;
        const speedScale = (layer === 0 ? 0.22 : layer === 1 ? 0.42 : 0.62) * depthZ;

        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speedScale,
          vy: (Math.random() - 0.5) * speedScale,
          baseRadius: r,
          radius: r,
          layer,
          color: item.main,
          glowColor: item.glow,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03,
          driftPhase: Math.random() * Math.PI * 2,
          depthZ,
        });
      }

      // 2. Benzene Rings with 3D Gyroscopic Tilt Wobble
      benzeneRings = [];
      for (let i = 0; i < ringCount; i++) {
        const item = PALETTE[i % (PALETTE.length - 1)];
        const depthZ = 0.55 + Math.random() * 0.45;
        benzeneRings.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.22 * depthZ,
          vy: (Math.random() - 0.5) * 0.22 * depthZ,
          size: (Math.random() * 30 + (isMobile ? 24 : 36)) * depthZ,
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.008,
          tiltAngleX: Math.random() * Math.PI * 2,
          tiltAngleY: Math.random() * Math.PI * 2,
          vTiltX: 0.006 + Math.random() * 0.008,
          vTiltY: 0.008 + Math.random() * 0.009,
          color: item.main,
          glowColor: item.glow,
          opacity: 0.28 * depthZ,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: 0.025 + Math.random() * 0.018,
          depthZ,
        });
      }

      // 3. Holographic Radar Scopes
      radars = [];
      for (let i = 0; i < radarCount; i++) {
        const posX = i === 0 ? width * 0.16 : width * 0.84;
        const posY = i === 0 ? height * 0.74 : height * 0.22;
        const blips = [
          { angle: Math.random() * Math.PI * 2, dist: 0.4, opacity: 0.8 },
          { angle: Math.random() * Math.PI * 2, dist: 0.75, opacity: 0.95 },
        ];
        radars.push({
          x: posX,
          y: posY,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14,
          radius: isMobile ? 48 : 68,
          angle: 0,
          sweepSpeed: 0.026,
          color: i === 0 ? "#f97316" : "#0284c7",
          opacity: 0.38,
          blips,
        });
      }

      // 4. Floating Holographic Donut/Pie Charts
      donutCharts = [];
      const donutData = [
        { label: "BATCH 94%", segments: [{ percent: 0.74, color: "#f97316" }, { percent: 0.26, color: "#fed7aa" }], x: width * 0.12, y: height * 0.24 },
        { label: "ERP SYNC", segments: [{ percent: 0.88, color: "#10b981" }, { percent: 0.12, color: "#a7f3d0" }], x: width * 0.88, y: height * 0.76 },
        { label: "STOCK", segments: [{ percent: 0.65, color: "#0284c7" }, { percent: 0.35, color: "#bae6fd" }], x: width * 0.5, y: height * 0.9 },
      ];
      for (let i = 0; i < donutCount; i++) {
        const d = donutData[i % donutData.length];
        donutCharts.push({
          x: d.x,
          y: d.y,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          radius: isMobile ? 32 : 46,
          angle: 0,
          rotSpeed: 0.009,
          segments: d.segments,
          opacity: 0.4,
          label: d.label,
        });
      }

      // 5. Holographic Trend Graph Waveforms
      trendWaves = [];
      for (let i = 0; i < waveCount; i++) {
        const posX = i === 0 ? width * 0.22 : width * 0.78;
        const posY = i === 0 ? height * 0.42 : height * 0.58;
        trendWaves.push({
          x: posX,
          y: posY,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          width: isMobile ? 90 : 136,
          height: 38,
          phase: 0,
          phaseSpeed: 0.038,
          color: i === 0 ? "#ea580c" : "#0284c7",
          opacity: 0.42,
          label: i === 0 ? "SALES VELOCITY ▲" : "ERP PULSE 60fps",
        });
      }

      pulses = [];
      shockwaves = [];
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      initElements();
    }

    resize();
    window.addEventListener("resize", resize);

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovered = true;
    }

    function handleMouseLeave() {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.isHovered = false;
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) {
        const rect = canvas!.getBoundingClientRect();
        mouse.targetX = e.touches[0].clientX - rect.left;
        mouse.targetY = e.touches[0].clientY - rect.top;
        mouse.isHovered = true;
      }
    }

    function handleTouchEnd() {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.isHovered = false;
    }

    function handleClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      shockwaves.push({
        x: clickX,
        y: clickY,
        radius: 6,
        maxRadius: Math.min(width, height) * 0.54,
        opacity: 0.9,
        speed: 5.5,
        color: "#f97316",
      });

      shockwaves.push({
        x: clickX,
        y: clickY,
        radius: 2,
        maxRadius: Math.min(width, height) * 0.44,
        opacity: 0.8,
        speed: 4.0,
        color: "#0284c7",
      });

      for (let i = 0; i < nodes.length; i++) {
        const dx = nodes[i].x - clickX;
        const dy = nodes[i].y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 280 && dist > 0) {
          const push = (1 - dist / 280) * 9;
          nodes[i].vx += (dx / dist) * push;
          nodes[i].vy += (dy / dist) * push;

          for (let j = 0; j < nodes.length; j++) {
            if (i !== j) {
              const ndx = nodes[i].x - nodes[j].x;
              const ndy = nodes[i].y - nodes[j].y;
              const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
              if (nDist < 180 && Math.random() < 0.6) {
                pulses.push({
                  fromNode: i,
                  toNode: j,
                  progress: 0,
                  speed: 0.038 + Math.random() * 0.032,
                  color: nodes[i].color,
                  trailLength: 0.28,
                });
              }
            }
          }
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("click", handleClick);

    // 3D Gyro Projection for Benzene Rings
    function draw3DHexagon(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      angle: number,
      tiltX: number,
      tiltY: number
    ) {
      const scaleX = 0.85 + Math.cos(tiltX) * 0.25; // Gyro 3D horizontal squash/stretch
      const scaleY = 0.85 + Math.sin(tiltY) * 0.25; // Gyro 3D vertical squash/stretch

      context.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = angle + (i * Math.PI) / 3;
        const hx = x + size * Math.cos(a) * scaleX;
        const hy = y + size * Math.sin(a) * scaleY;
        if (i === 0) context.moveTo(hx, hy);
        else context.lineTo(hx, hy);
      }
      context.closePath();
    }

    function render(currentTime: number) {
      lastTime = currentTime;

      mouse.x += (mouse.targetX - mouse.x) * 0.14;
      mouse.y += (mouse.targetY - mouse.y) * 0.14;
      mouse.reticleAngle += 0.022;

      ctx!.clearRect(0, 0, width, height);

      const maxDist = width < 640 ? 120 : 175;
      const maxDistSq = maxDist * maxDist;

      // ---------------- 1. DRAW HOLOGRAPHIC RADAR SCOPES ----------------
      for (let i = 0; i < radars.length; i++) {
        const r = radars[i];
        if (!reducedMotion) {
          r.x += r.vx;
          r.y += r.vy;
          r.angle += r.sweepSpeed;
          if (r.x < -r.radius * 2) r.x = width + r.radius * 2;
          if (r.x > width + r.radius * 2) r.x = -r.radius * 2;
          if (r.y < -r.radius * 2) r.y = height + r.radius * 2;
          if (r.y > height + r.radius * 2) r.y = -r.radius * 2;
        }

        let hoverBoost = 0;
        if (mouse.isHovered) {
          const dx = mouse.x - r.x;
          const dy = mouse.y - r.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 230) hoverBoost = (1 - dist / 230) * 0.6;
        }

        const activeOpacity = Math.min(r.opacity + hoverBoost, 0.95);

        ctx!.save();
        ctx!.translate(r.x, r.y);
        ctx!.globalAlpha = activeOpacity;
        ctx!.strokeStyle = r.color;
        ctx!.lineWidth = 1.3;

        // Concentric Rings
        ctx!.beginPath();
        ctx!.arc(0, 0, r.radius, 0, Math.PI * 2);
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(0, 0, r.radius * 0.65, 0, Math.PI * 2);
        ctx!.setLineDash([4, 4]);
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(0, 0, r.radius * 0.32, 0, Math.PI * 2);
        ctx!.setLineDash([]);
        ctx!.stroke();

        // Crosshairs
        ctx!.beginPath();
        ctx!.moveTo(-r.radius * 1.1, 0);
        ctx!.lineTo(r.radius * 1.1, 0);
        ctx!.moveTo(0, -r.radius * 1.1);
        ctx!.lineTo(0, r.radius * 1.1);
        ctx!.stroke();

        // Sweep Cone Beam
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.arc(0, 0, r.radius, r.angle, r.angle + 0.65);
        ctx!.closePath();
        const sweepGrad = ctx!.createRadialGradient(0, 0, 0, 0, 0, r.radius);
        sweepGrad.addColorStop(0, "transparent");
        sweepGrad.addColorStop(1, r.color);
        ctx!.fillStyle = sweepGrad;
        ctx!.globalAlpha = activeOpacity * 0.48;
        ctx!.fill();

        // Blips
        for (let b of r.blips) {
          const bx = Math.cos(b.angle) * (r.radius * b.dist);
          const by = Math.sin(b.angle) * (r.radius * b.dist);
          ctx!.beginPath();
          ctx!.arc(bx, by, 3.2, 0, Math.PI * 2);
          ctx!.fillStyle = r.color;
          ctx!.globalAlpha = activeOpacity * b.opacity;
          ctx!.shadowColor = r.color;
          ctx!.shadowBlur = 6;
          ctx!.fill();
        }

        ctx!.restore();
      }

      // ---------------- 2. DRAW HOLOGRAPHIC DONUT / PIE CHARTS ----------------
      for (let i = 0; i < donutCharts.length; i++) {
        const d = donutCharts[i];
        if (!reducedMotion) {
          d.x += d.vx;
          d.y += d.vy;
          d.angle += d.rotSpeed;
          if (d.x < -d.radius * 2) d.x = width + d.radius * 2;
          if (d.x > width + d.radius * 2) d.x = -d.radius * 2;
          if (d.y < -d.radius * 2) d.y = height + d.radius * 2;
          if (d.y > height + d.radius * 2) d.y = -d.radius * 2;
        }

        let hoverBoost = 0;
        if (mouse.isHovered) {
          const dx = mouse.x - d.x;
          const dy = mouse.y - d.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 210) hoverBoost = (1 - dist / 210) * 0.55;
        }

        const activeOpacity = Math.min(d.opacity + hoverBoost, 0.95);

        ctx!.save();
        ctx!.translate(d.x, d.y);
        ctx!.globalAlpha = activeOpacity;

        let startAngle = d.angle;
        for (let seg of d.segments) {
          const segAngle = seg.percent * Math.PI * 2;
          ctx!.beginPath();
          ctx!.arc(0, 0, d.radius, startAngle, startAngle + segAngle - 0.08);
          ctx!.strokeStyle = seg.color;
          ctx!.lineWidth = 5.5;
          ctx!.shadowColor = seg.color;
          ctx!.shadowBlur = 6;
          ctx!.stroke();
          startAngle += segAngle;
        }

        // Center micro label
        ctx!.fillStyle = "#ea580c";
        ctx!.font = "bold 9.5px monospace";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(d.label, 0, 0);

        ctx!.restore();
      }

      // ---------------- 3. DRAW HOLOGRAPHIC TREND GRAPH WAVES ----------------
      for (let i = 0; i < trendWaves.length; i++) {
        const w = trendWaves[i];
        if (!reducedMotion) {
          w.x += w.vx;
          w.y += w.vy;
          w.phase += w.phaseSpeed;
          if (w.x < -w.width) w.x = width + w.width;
          if (w.x > width + w.width) w.x = -w.width;
          if (w.y < -w.height * 2) w.y = height + w.height * 2;
          if (w.y > height + w.height * 2) w.y = -w.height * 2;
        }

        let hoverBoost = 0;
        if (mouse.isHovered) {
          const dx = mouse.x - (w.x + w.width / 2);
          const dy = mouse.y - w.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 230) hoverBoost = (1 - dist / 230) * 0.55;
        }

        const activeOpacity = Math.min(w.opacity + hoverBoost, 0.95);

        ctx!.save();
        ctx!.translate(w.x, w.y);
        ctx!.globalAlpha = activeOpacity;

        // Bounding baseline & grid
        ctx!.strokeStyle = w.color;
        ctx!.lineWidth = 1;
        ctx!.setLineDash([3, 3]);
        ctx!.strokeRect(0, -w.height / 2, w.width, w.height);
        ctx!.setLineDash([]);

        // Spline Waveform with glowing flare
        ctx!.beginPath();
        for (let x = 0; x <= w.width; x += 5) {
          const normX = x / w.width;
          const y = Math.sin(normX * Math.PI * 3 + w.phase) * (w.height * 0.4);
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.strokeStyle = w.color;
        ctx!.lineWidth = 2.4;
        ctx!.shadowColor = w.color;
        ctx!.shadowBlur = 10;
        ctx!.stroke();

        // Top tag label
        ctx!.fillStyle = w.color;
        ctx!.font = "bold 9px monospace";
        ctx!.textAlign = "left";
        ctx!.fillText(w.label, 4, -w.height / 2 - 5);

        ctx!.restore();
      }

      // ---------------- 4. BENZENE RINGS (3D GYROSCOPIC TILT) ----------------
      for (let i = 0; i < benzeneRings.length; i++) {
        const b = benzeneRings[i];
        if (!reducedMotion) {
          b.x += b.vx;
          b.y += b.vy;
          b.angle += b.vAngle;
          b.tiltAngleX += b.vTiltX;
          b.tiltAngleY += b.vTiltY;
          b.orbitAngle += b.orbitSpeed;

          if (b.x < -b.size * 2) b.x = width + b.size * 2;
          if (b.x > width + b.size * 2) b.x = -b.size * 2;
          if (b.y < -b.size * 2) b.y = height + b.size * 2;
          if (b.y > height + b.size * 2) b.y = -b.size * 2;
        }

        const scaleX = 0.85 + Math.cos(b.tiltAngleX) * 0.25;
        const scaleY = 0.85 + Math.sin(b.tiltAngleY) * 0.25;

        ctx!.save();
        ctx!.strokeStyle = b.color;
        ctx!.shadowColor = b.glowColor;
        ctx!.shadowBlur = 12;
        ctx!.globalAlpha = b.opacity;
        ctx!.lineWidth = 1.7;
        ctx!.setLineDash([6, 5]);

        draw3DHexagon(ctx!, b.x, b.y, b.size, b.angle, b.tiltAngleX, b.tiltAngleY);
        ctx!.stroke();

        // Inner conjugated aromatic ring with 3D scale
        ctx!.beginPath();
        ctx!.ellipse(b.x, b.y, b.size * 0.46 * scaleX, b.size * 0.46 * scaleY, 0, 0, Math.PI * 2);
        ctx!.setLineDash([]);
        ctx!.lineWidth = 1.3;
        ctx!.stroke();

        // Alternating double bonds
        for (let k = 0; k < 6; k += 2) {
          const a1 = b.angle + (k * Math.PI) / 3;
          const a2 = b.angle + ((k + 1) * Math.PI) / 3;
          const x1 = b.x + (b.size * 0.82) * Math.cos(a1) * scaleX;
          const y1 = b.y + (b.size * 0.82) * Math.sin(a1) * scaleY;
          const x2 = b.x + (b.size * 0.82) * Math.cos(a2) * scaleX;
          const y2 = b.y + (b.size * 0.82) * Math.sin(a2) * scaleY;
          ctx!.beginPath();
          ctx!.moveTo(x1, y1);
          ctx!.lineTo(x2, y2);
          ctx!.lineWidth = 1.2;
          ctx!.stroke();
        }

        // Orbiting electron photon
        const ox = b.x + b.size * 0.46 * Math.cos(b.orbitAngle) * scaleX;
        const oy = b.y + b.size * 0.46 * Math.sin(b.orbitAngle) * scaleY;

        ctx!.beginPath();
        ctx!.arc(ox, oy, 2.8, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.shadowColor = b.color;
        ctx!.shadowBlur = 10;
        ctx!.fill();

        // Vertex Atoms
        for (let j = 0; j < 6; j++) {
          const a = b.angle + (j * Math.PI) / 3;
          const cx = b.x + b.size * Math.cos(a) * scaleX;
          const cy = b.y + b.size * Math.sin(a) * scaleY;

          ctx!.beginPath();
          ctx!.arc(cx, cy, 3.0, 0, Math.PI * 2);
          ctx!.fillStyle = b.color;
          ctx!.shadowColor = b.glowColor;
          ctx!.shadowBlur = 8;
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(cx - 0.7, cy - 0.7, 1.0, 0, Math.PI * 2);
          ctx!.fillStyle = "#ffffff";
          ctx!.fill();
        }

        ctx!.restore();
      }

      // ---------------- 5. SHOCKWAVE RESONANCES ----------------
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const rip = shockwaves[i];
        rip.radius += rip.speed;
        rip.opacity -= 0.016;

        if (rip.opacity <= 0 || rip.radius >= rip.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx!.strokeStyle = rip.color;
        ctx!.globalAlpha = rip.opacity * 0.85;
        ctx!.lineWidth = 2.8;
        ctx!.shadowColor = rip.color;
        ctx!.shadowBlur = 14;
        ctx!.stroke();
        ctx!.restore();
      }

      // ---------------- 6. UPDATE NODES & GRAVITATIONAL LENS ----------------
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!reducedMotion) {
          node.driftPhase += 0.016;
          node.x += node.vx + Math.sin(node.driftPhase) * 0.16;
          node.y += node.vy + Math.cos(node.driftPhase) * 0.16;

          node.vx *= 0.985;
          node.vy *= 0.985;

          if (Math.abs(node.vx) < 0.1) node.vx = (Math.random() - 0.5) * 0.4;
          if (Math.abs(node.vy) < 0.1) node.vy = (Math.random() - 0.5) * 0.4;

          if (node.x <= 0 || node.x >= width) node.vx *= -1;
          if (node.y <= 0 || node.y >= height) node.vy *= -1;

          node.pulsePhase += node.pulseSpeed;
          node.radius = node.baseRadius + Math.sin(node.pulsePhase) * 0.6;
        }

        // Gravitational lens deflection
        if (mouse.isHovered) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius && dist > 0) {
            const layerMultiplier = node.layer === 2 ? 1.3 : node.layer === 1 ? 1.0 : 0.6;
            const force = (1 - dist / mouse.radius) * 2.4 * layerMultiplier;
            node.x -= (dx / dist) * force * 1.8;
            node.y -= (dy / dist) * force * 1.8;
          }
        }
      }

      // ---------------- 7. CONNECTOR BONDS & CURVED FLUID SYNAPSES ----------------
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = Math.pow(1 - dist / maxDist, 1.25) * 0.58;

            let mouseBoost = 0;
            if (mouse.isHovered) {
              const midX = (n1.x + n2.x) / 2;
              const midY = (n1.y + n2.y) / 2;
              const mdx = mouse.x - midX;
              const mdy = mouse.y - midY;
              const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
              if (mDist < 150) {
                mouseBoost = (1 - mDist / 150) * 0.48;
              }
            }

            const finalAlpha = Math.min(alpha + mouseBoost, 0.95);

            ctx!.beginPath();
            ctx!.moveTo(n1.x, n1.y);
            ctx!.lineTo(n2.x, n2.y);

            ctx!.strokeStyle = n1.color;
            ctx!.globalAlpha = finalAlpha;
            ctx!.lineWidth = mouseBoost > 0.1 ? 2.2 : n1.layer === 2 ? 1.6 : 1.1;
            ctx!.stroke();

            if (!reducedMotion && pulses.length < 20 && Math.random() < 0.001) {
              pulses.push({
                fromNode: i,
                toNode: j,
                progress: 0,
                speed: 0.026 + Math.random() * 0.03,
                color: n1.color,
                trailLength: 0.25,
              });
            }
          }
        }
      }

      // ---------------- 8. FLUID PHOTON SYNAPSE PULSES ----------------
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          pulses.splice(i, 1);
          continue;
        }

        const from = nodes[p.fromNode];
        const to = nodes[p.toNode];
        if (!from || !to) {
          pulses.splice(i, 1);
          continue;
        }

        const px = from.x + (to.x - from.x) * p.progress;
        const py = from.y + (to.y - from.y) * p.progress;

        const tailProg = Math.max(0, p.progress - p.trailLength);
        const tx = from.x + (to.x - from.x) * tailProg;
        const ty = from.y + (to.y - from.y) * tailProg;

        // Draw laser comet trail
        ctx!.save();
        const laserGrad = ctx!.createLinearGradient(tx, ty, px, py);
        laserGrad.addColorStop(0, "transparent");
        laserGrad.addColorStop(1, p.color);

        ctx!.beginPath();
        ctx!.moveTo(tx, ty);
        ctx!.lineTo(px, py);
        ctx!.strokeStyle = laserGrad;
        ctx!.lineWidth = 3.0;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 12;
        ctx!.stroke();

        // Glowing Photon Core
        ctx!.beginPath();
        ctx!.arc(px, py, 3.6, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 12;
        ctx!.globalAlpha = 0.95;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.fill();
        ctx!.restore();
      }

      // ---------------- 9. DRAW ATOM NODES (DEPTH OF FIELD) ----------------
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, Math.max(n.radius, 1.6), 0, Math.PI * 2);

        ctx!.fillStyle = n.color;
        ctx!.shadowColor = n.glowColor;
        ctx!.shadowBlur = n.layer === 2 ? 12 : n.layer === 1 ? 8 : 4;
        ctx!.globalAlpha = n.layer === 0 ? 0.6 : n.layer === 1 ? 0.85 : 0.98;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.radius * (n.layer === 2 ? 2.5 : 1.9), 0, Math.PI * 2);
        ctx!.fillStyle = n.glowColor;
        ctx!.globalAlpha = n.layer === 2 ? 0.3 : 0.16;
        ctx!.fill();

        if (n.layer >= 1) {
          ctx!.beginPath();
          ctx!.arc(n.x - n.radius * 0.32, n.y - n.radius * 0.32, n.radius * 0.38, 0, Math.PI * 2);
          ctx!.fillStyle = "#ffffff";
          ctx!.globalAlpha = 0.9;
          ctx!.fill();
        }

        ctx!.restore();
      }

      // ---------------- 10. MOUSE HOLOGRAPHIC RETICLE / HUD TARGET ----------------
      if (mouse.isHovered && mouse.x > 0 && mouse.y > 0) {
        ctx!.save();
        ctx!.translate(mouse.x, mouse.y);
        ctx!.strokeStyle = "#f97316";
        ctx!.globalAlpha = 0.45;
        ctx!.lineWidth = 1.3;

        // Rotating HUD Reticle Outer Ring
        ctx!.beginPath();
        ctx!.arc(0, 0, 34, mouse.reticleAngle, mouse.reticleAngle + Math.PI * 1.5);
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(0, 0, 24, -mouse.reticleAngle, -mouse.reticleAngle + Math.PI);
        ctx!.setLineDash([3, 3]);
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Center crosshair micro dot
        ctx!.beginPath();
        ctx!.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx!.fillStyle = "#ea580c";
        ctx!.fill();

        ctx!.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pharma-canvas-wrapper" aria-hidden="true">
      <canvas ref={canvasRef} className="pharma-canvas" />
      <div className="cyber-grid" />
      <div className="canvas-vignette" />
    </div>
  );
}
