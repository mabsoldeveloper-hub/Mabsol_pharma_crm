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
}

interface BenzeneStructure {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  color: string;
  glowColor: string;
  opacity: number;
  orbitAngle: number;
  orbitSpeed: number;
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

// Saturated, Rich Warm Peach, Coral Flame, Golden Amber & Sky Cyan Palette
const PALETTE = [
  { main: "#f97316", glow: "rgba(249, 115, 22, 0.6)" },   // Vibrant Warm Peach
  { main: "#fb923c", glow: "rgba(251, 146, 60, 0.55)" },  // Soft Apricot
  { main: "#ea580c", glow: "rgba(234, 88, 12, 0.65)" },   // Deep Sunset Peach
  { main: "#e11d48", glow: "rgba(225, 29, 72, 0.5)" },    // Coral Rose
  { main: "#0284c7", glow: "rgba(2, 132, 199, 0.55)" },   // Sky Azure
  { main: "#6366f1", glow: "rgba(99, 102, 241, 0.5)" },   // Soft Indigo
  { main: "#10b981", glow: "rgba(16, 185, 129, 0.55)" },  // Bio Emerald
];

export default function PharmaBackgroundCanvas() {
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
      radius: 240,
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
      const nodeCount = isMobile ? 32 : isTablet ? 55 : 80;
      const ringCount = isMobile ? 3 : isTablet ? 5 : 7;
      const radarCount = isMobile ? 1 : 2;
      const donutCount = isMobile ? 1 : 3;
      const waveCount = isMobile ? 1 : 2;

      // 1. Molecular Nodes
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const item = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const layer = Math.random() < 0.35 ? 0 : Math.random() < 0.75 ? 1 : 2;
        const baseR = layer === 0 ? 1.6 : layer === 1 ? 2.4 : 3.2;
        const r = baseR + Math.random() * 0.8;
        const speedScale = layer === 0 ? 0.25 : layer === 1 ? 0.45 : 0.65;

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
        });
      }

      // 2. Benzene Rings
      benzeneRings = [];
      for (let i = 0; i < ringCount; i++) {
        const item = PALETTE[i % (PALETTE.length - 1)];
        benzeneRings.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          size: Math.random() * 32 + (isMobile ? 24 : 34),
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.007,
          color: item.main,
          glowColor: item.glow,
          opacity: 0.28,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: 0.022 + Math.random() * 0.015,
        });
      }

      // 3. Holographic Radar Scopes
      radars = [];
      for (let i = 0; i < radarCount; i++) {
        const posX = i === 0 ? width * 0.18 : width * 0.82;
        const posY = i === 0 ? height * 0.72 : height * 0.25;
        const blips = [
          { angle: Math.random() * Math.PI * 2, dist: 0.4, opacity: 0.8 },
          { angle: Math.random() * Math.PI * 2, dist: 0.75, opacity: 0.9 },
        ];
        radars.push({
          x: posX,
          y: posY,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          radius: isMobile ? 48 : 65,
          angle: 0,
          sweepSpeed: 0.024,
          color: i === 0 ? "#f97316" : "#0284c7",
          opacity: 0.35,
          blips,
        });
      }

      // 4. Floating Holographic Donut/Pie Charts
      donutCharts = [];
      const donutData = [
        { label: "BATCH 94%", segments: [{ percent: 0.74, color: "#f97316" }, { percent: 0.26, color: "#fed7aa" }], x: width * 0.12, y: height * 0.25 },
        { label: "ERP SYNC", segments: [{ percent: 0.88, color: "#10b981" }, { percent: 0.12, color: "#a7f3d0" }], x: width * 0.88, y: height * 0.75 },
        { label: "STOCK", segments: [{ percent: 0.65, color: "#0284c7" }, { percent: 0.35, color: "#bae6fd" }], x: width * 0.5, y: height * 0.88 },
      ];
      for (let i = 0; i < donutCount; i++) {
        const d = donutData[i % donutData.length];
        donutCharts.push({
          x: d.x,
          y: d.y,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          radius: isMobile ? 32 : 44,
          angle: 0,
          rotSpeed: 0.008,
          segments: d.segments,
          opacity: 0.38,
          label: d.label,
        });
      }

      // 5. Holographic Trend Graph Waveforms
      trendWaves = [];
      for (let i = 0; i < waveCount; i++) {
        const posX = i === 0 ? width * 0.22 : width * 0.76;
        const posY = i === 0 ? height * 0.42 : height * 0.58;
        trendWaves.push({
          x: posX,
          y: posY,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          width: isMobile ? 90 : 130,
          height: 36,
          phase: 0,
          phaseSpeed: 0.035,
          color: i === 0 ? "#ea580c" : "#0284c7",
          opacity: 0.4,
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
        radius: 8,
        maxRadius: Math.min(width, height) * 0.52,
        opacity: 0.85,
        speed: 5.2,
        color: "#f97316",
      });

      shockwaves.push({
        x: clickX,
        y: clickY,
        radius: 2,
        maxRadius: Math.min(width, height) * 0.42,
        opacity: 0.75,
        speed: 3.8,
        color: "#0284c7",
      });

      for (let i = 0; i < nodes.length; i++) {
        const dx = nodes[i].x - clickX;
        const dy = nodes[i].y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 260 && dist > 0) {
          const push = (1 - dist / 260) * 8;
          nodes[i].vx += (dx / dist) * push;
          nodes[i].vy += (dy / dist) * push;

          for (let j = 0; j < nodes.length; j++) {
            if (i !== j) {
              const ndx = nodes[i].x - nodes[j].x;
              const ndy = nodes[i].y - nodes[j].y;
              const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
              if (nDist < 170 && Math.random() < 0.5) {
                pulses.push({
                  fromNode: i,
                  toNode: j,
                  progress: 0,
                  speed: 0.035 + Math.random() * 0.03,
                  color: nodes[i].color,
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

    function drawHexagon(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      angle: number
    ) {
      context.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = angle + (i * Math.PI) / 3;
        const hx = x + size * Math.cos(a);
        const hy = y + size * Math.sin(a);
        if (i === 0) context.moveTo(hx, hy);
        else context.lineTo(hx, hy);
      }
      context.closePath();
    }

    function render(currentTime: number) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      mouse.x += (mouse.targetX - mouse.x) * 0.14;
      mouse.y += (mouse.targetY - mouse.y) * 0.14;
      mouse.reticleAngle += 0.02;

      ctx!.clearRect(0, 0, width, height);

      const maxDist = width < 640 ? 120 : 170;
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

        // Proximity hover boost
        let hoverBoost = 0;
        if (mouse.isHovered) {
          const dx = mouse.x - r.x;
          const dy = mouse.y - r.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) hoverBoost = (1 - dist / 220) * 0.55;
        }

        const activeOpacity = Math.min(r.opacity + hoverBoost, 0.95);

        ctx!.save();
        ctx!.translate(r.x, r.y);
        ctx!.globalAlpha = activeOpacity;
        ctx!.strokeStyle = r.color;
        ctx!.lineWidth = 1.2;

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
        ctx!.arc(0, 0, r.radius, r.angle, r.angle + 0.6);
        ctx!.closePath();
        const sweepGrad = ctx!.createRadialGradient(0, 0, 0, 0, 0, r.radius);
        sweepGrad.addColorStop(0, "transparent");
        sweepGrad.addColorStop(1, r.color);
        ctx!.fillStyle = sweepGrad;
        ctx!.globalAlpha = activeOpacity * 0.45;
        ctx!.fill();

        // Blips
        for (let b of r.blips) {
          const bx = Math.cos(b.angle) * (r.radius * b.dist);
          const by = Math.sin(b.angle) * (r.radius * b.dist);
          ctx!.beginPath();
          ctx!.arc(bx, by, 3, 0, Math.PI * 2);
          ctx!.fillStyle = r.color;
          ctx!.globalAlpha = activeOpacity * b.opacity;
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
          if (dist < 200) hoverBoost = (1 - dist / 200) * 0.55;
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
          ctx!.stroke();
          startAngle += segAngle;
        }

        // Center micro label
        ctx!.fillStyle = "#ea580c";
        ctx!.font = "bold 9px monospace";
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
          if (dist < 220) hoverBoost = (1 - dist / 220) * 0.55;
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

        // Spline Waveform
        ctx!.beginPath();
        for (let x = 0; x <= w.width; x += 6) {
          const normX = x / w.width;
          const y = Math.sin(normX * Math.PI * 3 + w.phase) * (w.height * 0.38);
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.strokeStyle = w.color;
        ctx!.lineWidth = 2.2;
        ctx!.shadowColor = w.color;
        ctx!.shadowBlur = 8;
        ctx!.stroke();

        // Top tag label
        ctx!.fillStyle = w.color;
        ctx!.font = "bold 8.5px monospace";
        ctx!.textAlign = "left";
        ctx!.fillText(w.label, 4, -w.height / 2 - 4);

        ctx!.restore();
      }

      // ---------------- 4. BENZENE RINGS ----------------
      for (let i = 0; i < benzeneRings.length; i++) {
        const b = benzeneRings[i];
        if (!reducedMotion) {
          b.x += b.vx;
          b.y += b.vy;
          b.angle += b.vAngle;
          b.orbitAngle += b.orbitSpeed;

          if (b.x < -b.size * 2) b.x = width + b.size * 2;
          if (b.x > width + b.size * 2) b.x = -b.size * 2;
          if (b.y < -b.size * 2) b.y = height + b.size * 2;
          if (b.y > height + b.size * 2) b.y = -b.size * 2;
        }

        ctx!.save();
        ctx!.strokeStyle = b.color;
        ctx!.shadowColor = b.glowColor;
        ctx!.shadowBlur = 10;
        ctx!.globalAlpha = b.opacity;
        ctx!.lineWidth = 1.6;
        ctx!.setLineDash([6, 5]);

        drawHexagon(ctx!, b.x, b.y, b.size, b.angle);
        ctx!.stroke();

        // Inner conjugated aromatic ring
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.size * 0.46, 0, Math.PI * 2);
        ctx!.setLineDash([]);
        ctx!.lineWidth = 1.2;
        ctx!.stroke();

        // Alternating double bonds
        for (let k = 0; k < 6; k += 2) {
          const a1 = b.angle + (k * Math.PI) / 3;
          const a2 = b.angle + ((k + 1) * Math.PI) / 3;
          const x1 = b.x + (b.size * 0.82) * Math.cos(a1);
          const y1 = b.y + (b.size * 0.82) * Math.sin(a1);
          const x2 = b.x + (b.size * 0.82) * Math.cos(a2);
          const y2 = b.y + (b.size * 0.82) * Math.sin(a2);
          ctx!.beginPath();
          ctx!.moveTo(x1, y1);
          ctx!.lineTo(x2, y2);
          ctx!.lineWidth = 1.1;
          ctx!.stroke();
        }

        // Orbiting electron photon
        const ox = b.x + b.size * 0.46 * Math.cos(b.orbitAngle);
        const oy = b.y + b.size * 0.46 * Math.sin(b.orbitAngle);

        ctx!.beginPath();
        ctx!.arc(ox, oy, 2.6, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.shadowColor = b.color;
        ctx!.shadowBlur = 8;
        ctx!.fill();

        // Vertex Atoms
        for (let j = 0; j < 6; j++) {
          const a = b.angle + (j * Math.PI) / 3;
          const cx = b.x + b.size * Math.cos(a);
          const cy = b.y + b.size * Math.sin(a);

          ctx!.beginPath();
          ctx!.arc(cx, cy, 2.8, 0, Math.PI * 2);
          ctx!.fillStyle = b.color;
          ctx!.shadowColor = b.glowColor;
          ctx!.shadowBlur = 6;
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(cx - 0.7, cy - 0.7, 0.9, 0, Math.PI * 2);
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
        ctx!.globalAlpha = rip.opacity * 0.8;
        ctx!.lineWidth = 2.8;
        ctx!.shadowColor = rip.color;
        ctx!.shadowBlur = 12;
        ctx!.stroke();
        ctx!.restore();
      }

      // ---------------- 6. UPDATE NODES & PHYSICS ----------------
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!reducedMotion) {
          node.driftPhase += 0.015;
          node.x += node.vx + Math.sin(node.driftPhase) * 0.15;
          node.y += node.vy + Math.cos(node.driftPhase) * 0.15;

          node.vx *= 0.985;
          node.vy *= 0.985;

          if (Math.abs(node.vx) < 0.1) node.vx = (Math.random() - 0.5) * 0.4;
          if (Math.abs(node.vy) < 0.1) node.vy = (Math.random() - 0.5) * 0.4;

          if (node.x <= 0 || node.x >= width) node.vx *= -1;
          if (node.y <= 0 || node.y >= height) node.vy *= -1;

          node.pulsePhase += node.pulseSpeed;
          node.radius = node.baseRadius + Math.sin(node.pulsePhase) * 0.6;
        }

        if (mouse.isHovered) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius && dist > 0) {
            const layerMultiplier = node.layer === 2 ? 1.3 : node.layer === 1 ? 1.0 : 0.6;
            const force = (1 - dist / mouse.radius) * 2.2 * layerMultiplier;
            node.x -= (dx / dist) * force * 1.6;
            node.y -= (dy / dist) * force * 1.6;
          }
        }
      }

      // ---------------- 7. CONNECTOR BONDS ----------------
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = Math.pow(1 - dist / maxDist, 1.25) * 0.55;

            let mouseBoost = 0;
            if (mouse.isHovered) {
              const midX = (n1.x + n2.x) / 2;
              const midY = (n1.y + n2.y) / 2;
              const mdx = mouse.x - midX;
              const mdy = mouse.y - midY;
              const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
              if (mDist < 140) {
                mouseBoost = (1 - mDist / 140) * 0.45;
              }
            }

            const finalAlpha = Math.min(alpha + mouseBoost, 0.9);

            ctx!.beginPath();
            ctx!.moveTo(n1.x, n1.y);
            ctx!.lineTo(n2.x, n2.y);

            const grad = ctx!.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
            grad.addColorStop(0, n1.color);
            grad.addColorStop(1, n2.color);

            ctx!.strokeStyle = grad;
            ctx!.globalAlpha = finalAlpha;
            ctx!.lineWidth = mouseBoost > 0.1 ? 2.0 : n1.layer === 2 ? 1.5 : 1.1;
            ctx!.stroke();

            if (!reducedMotion && pulses.length < 18 && Math.random() < 0.0008) {
              pulses.push({
                fromNode: i,
                toNode: j,
                progress: 0,
                speed: 0.024 + Math.random() * 0.028,
                color: n1.color,
              });
            }
          }
        }
      }

      // ---------------- 8. ENERGY PHOTON PULSES ----------------
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

        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(px, py, 3.4, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 10;
        ctx!.globalAlpha = 0.95;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.fill();
        ctx!.restore();
      }

      // ---------------- 9. DRAW ATOM NODES ----------------
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, Math.max(n.radius, 1.6), 0, Math.PI * 2);

        ctx!.fillStyle = n.color;
        ctx!.shadowColor = n.glowColor;
        ctx!.shadowBlur = n.layer === 2 ? 10 : 6;
        ctx!.globalAlpha = n.layer === 0 ? 0.65 : 0.95;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.radius * (n.layer === 2 ? 2.4 : 1.9), 0, Math.PI * 2);
        ctx!.fillStyle = n.glowColor;
        ctx!.globalAlpha = n.layer === 2 ? 0.28 : 0.16;
        ctx!.fill();

        if (n.layer >= 1) {
          ctx!.beginPath();
          ctx!.arc(n.x - n.radius * 0.32, n.y - n.radius * 0.32, n.radius * 0.38, 0, Math.PI * 2);
          ctx!.fillStyle = "#ffffff";
          ctx!.globalAlpha = 0.85;
          ctx!.fill();
        }

        ctx!.restore();
      }

      // ---------------- 10. MOUSE HOLOGRAPHIC RETICLE / HUD TARGET ----------------
      if (mouse.isHovered && mouse.x > 0 && mouse.y > 0) {
        ctx!.save();
        ctx!.translate(mouse.x, mouse.y);
        ctx!.strokeStyle = "#f97316";
        ctx!.globalAlpha = 0.4;
        ctx!.lineWidth = 1.2;

        // Rotating HUD Reticle Outer Ring
        ctx!.beginPath();
        ctx!.arc(0, 0, 32, mouse.reticleAngle, mouse.reticleAngle + Math.PI * 1.5);
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(0, 0, 22, -mouse.reticleAngle, -mouse.reticleAngle + Math.PI);
        ctx!.setLineDash([3, 3]);
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Center crosshair micro dot
        ctx!.beginPath();
        ctx!.arc(0, 0, 2, 0, Math.PI * 2);
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
