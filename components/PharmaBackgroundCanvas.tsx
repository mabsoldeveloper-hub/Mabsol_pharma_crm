"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  layer: number; // 0: far, 1: mid, 2: near
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

// Warm Sunset Peach, Coral Flame, Golden Apricot, Sky Azure & Violet Palette
const PALETTE = [
  { main: "#f97316", glow: "rgba(249, 115, 22, 0.5)" },   // Vibrant Warm Peach
  { main: "#fb923c", glow: "rgba(251, 146, 60, 0.45)" },  // Soft Apricot
  { main: "#ea580c", glow: "rgba(234, 88, 12, 0.5)" },   // Deep Sunset Peach
  { main: "#e11d48", glow: "rgba(225, 29, 72, 0.4)" },    // Coral Rose
  { main: "#0284c7", glow: "rgba(2, 132, 199, 0.45)" },   // Sky Azure
  { main: "#6366f1", glow: "rgba(99, 102, 241, 0.4)" },   // Soft Indigo
  { main: "#10b981", glow: "rgba(16, 185, 129, 0.45)" },  // Bio Emerald
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
      radius: 220,
      isHovered: false,
    };

    let nodes: Node[] = [];
    let benzeneRings: BenzeneStructure[] = [];
    let pulses: PulsePacket[] = [];
    let shockwaves: Shockwave[] = [];
    let animationFrameId: number;
    let lastTime = performance.now();

    function initElements() {
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const nodeCount = isMobile ? 38 : isTablet ? 65 : 95;
      const ringCount = isMobile ? 4 : isTablet ? 7 : 9;

      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const item = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const layer = Math.random() < 0.35 ? 0 : Math.random() < 0.75 ? 1 : 2; // 0: Far, 1: Mid, 2: Near
        const baseR = layer === 0 ? 1.4 : layer === 1 ? 2.2 : 3.0;
        const r = baseR + Math.random() * 0.8;
        const speedScale = layer === 0 ? 0.25 : layer === 1 ? 0.45 : 0.65;

        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseX: 0,
          baseY: 0,
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

      benzeneRings = [];
      for (let i = 0; i < ringCount; i++) {
        const item = PALETTE[i % (PALETTE.length - 1)];
        benzeneRings.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.24,
          vy: (Math.random() - 0.5) * 0.24,
          size: Math.random() * 34 + (isMobile ? 24 : 36),
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.007,
          color: item.main,
          glowColor: item.glow,
          opacity: Math.random() * 0.22 + 0.22,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: 0.022 + Math.random() * 0.015,
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

      // Scatter kinetic energy & rapid photon pulse cascades
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

      ctx!.clearRect(0, 0, width, height);

      const maxDist = width < 640 ? 120 : 170;
      const maxDistSq = maxDist * maxDist;

      // 1. Draw 3D Benzene Ring Compounds with Conjugated Double Bonds
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

        // Alternating double bonds (Chemical representation)
        ctx!.setLineDash([]);
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

        // Orbiting electron photon with trailing light glow
        const ox = b.x + b.size * 0.46 * Math.cos(b.orbitAngle);
        const oy = b.y + b.size * 0.46 * Math.sin(b.orbitAngle);

        ctx!.beginPath();
        ctx!.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.shadowColor = b.color;
        ctx!.shadowBlur = 8;
        ctx!.fill();

        // Vertex Carbon/Nitrogen Atoms
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

      // 2. Shockwave Resonances
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

      // 3. Update Nodes & Fluid Brownian Motion
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!reducedMotion) {
          node.driftPhase += 0.015;
          node.x += node.vx + Math.sin(node.driftPhase) * 0.15;
          node.y += node.vy + Math.cos(node.driftPhase) * 0.15;

          // Friction to dampen push
          node.vx *= 0.985;
          node.vy *= 0.985;

          if (Math.abs(node.vx) < 0.1) node.vx = (Math.random() - 0.5) * 0.4;
          if (Math.abs(node.vy) < 0.1) node.vy = (Math.random() - 0.5) * 0.4;

          if (node.x <= 0 || node.x >= width) node.vx *= -1;
          if (node.y <= 0 || node.y >= height) node.vy *= -1;

          node.pulsePhase += node.pulseSpeed;
          node.radius = node.baseRadius + Math.sin(node.pulsePhase) * 0.6;
        }

        // Smooth Magnetic Cursor Field
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

      // 4. Molecular Connector Bonds
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = Math.pow(1 - dist / maxDist, 1.25) * 0.5;

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

            // Spawn data pulses
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

      // 5. Energy Photon Pulses with Trail
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
        // Photon core
        ctx!.beginPath();
        ctx!.arc(px, py, 3.4, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 10;
        ctx!.globalAlpha = 0.95;
        ctx!.fill();

        // White specular center
        ctx!.beginPath();
        ctx!.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.fill();

        ctx!.restore();
      }

      // 6. Draw 3D Layered Atom Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, Math.max(n.radius, 1.6), 0, Math.PI * 2);

        // Core atom
        ctx!.fillStyle = n.color;
        ctx!.shadowColor = n.glowColor;
        ctx!.shadowBlur = n.layer === 2 ? 10 : 6;
        ctx!.globalAlpha = n.layer === 0 ? 0.65 : 0.95;
        ctx!.fill();

        // Glowing corona
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.radius * (n.layer === 2 ? 2.4 : 1.9), 0, Math.PI * 2);
        ctx!.fillStyle = n.glowColor;
        ctx!.globalAlpha = n.layer === 2 ? 0.28 : 0.16;
        ctx!.fill();

        // 3D Specular Highlight Glint for Mid/Near layers
        if (n.layer >= 1) {
          ctx!.beginPath();
          ctx!.arc(n.x - n.radius * 0.32, n.y - n.radius * 0.32, n.radius * 0.38, 0, Math.PI * 2);
          ctx!.fillStyle = "#ffffff";
          ctx!.globalAlpha = 0.85;
          ctx!.fill();
        }

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
