"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  color: string;
  glowColor: string;
  pulsePhase: number;
  pulseSpeed: number;
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

// Breathtaking Pharma & Cyber-Science Color Palette
const PALETTE = [
  { main: "#ff9f43", glow: "rgba(255, 159, 67, 0.75)" },  // Radiant Amber
  { main: "#ff6b00", glow: "rgba(255, 107, 0, 0.75)" },   // Neon Flame
  { main: "#00f2fe", glow: "rgba(0, 242, 254, 0.8)" },    // Bio Electric Cyan
  { main: "#818cf8", glow: "rgba(129, 140, 248, 0.7)" },  // Royal Indigo
  { main: "#10b981", glow: "rgba(16, 185, 129, 0.75)" },  // Sync Emerald
  { main: "#f43f5e", glow: "rgba(244, 63, 94, 0.75)" },   // Biotech Rose
  { main: "#ffffff", glow: "rgba(255, 255, 255, 0.9)" },   // Pure Core Light
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
      const nodeCount = isMobile ? 38 : isTablet ? 65 : 100;
      const ringCount = isMobile ? 4 : isTablet ? 7 : 10;

      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const item = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const r = Math.random() * 2.8 + (isMobile ? 1.8 : 2.5);
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (isMobile ? 0.38 : 0.55),
          vy: (Math.random() - 0.5) * (isMobile ? 0.38 : 0.55),
          baseRadius: r,
          radius: r,
          color: item.main,
          glowColor: item.glow,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.025 + Math.random() * 0.035,
        });
      }

      benzeneRings = [];
      for (let i = 0; i < ringCount; i++) {
        const item = PALETTE[i % (PALETTE.length - 1)];
        benzeneRings.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          size: Math.random() * 34 + (isMobile ? 24 : 36),
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.007,
          color: item.main,
          glowColor: item.glow,
          opacity: Math.random() * 0.35 + 0.25,
          orbitAngle: Math.random() * Math.PI * 2,
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
        maxRadius: Math.min(width, height) * 0.55,
        opacity: 0.95,
        speed: 5,
        color: "#ff7700",
      });

      shockwaves.push({
        x: clickX,
        y: clickY,
        radius: 2,
        maxRadius: Math.min(width, height) * 0.45,
        opacity: 0.8,
        speed: 3.8,
        color: "#00f2fe",
      });

      // Scatter rapid photons across nearby bonds
      for (let i = 0; i < nodes.length; i++) {
        const dx = nodes[i].x - clickX;
        const dy = nodes[i].y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 260) {
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

      const maxDist = width < 640 ? 125 : 175;
      const maxDistSq = maxDist * maxDist;

      // 1. Draw 3D Benzene Ring Compounds
      for (let i = 0; i < benzeneRings.length; i++) {
        const b = benzeneRings[i];
        if (!reducedMotion) {
          b.x += b.vx;
          b.y += b.vy;
          b.angle += b.vAngle;
          b.orbitAngle += 0.02;

          if (b.x < -b.size * 2) b.x = width + b.size * 2;
          if (b.x > width + b.size * 2) b.x = -b.size * 2;
          if (b.y < -b.size * 2) b.y = height + b.size * 2;
          if (b.y > height + b.size * 2) b.y = -b.size * 2;
        }

        ctx!.save();
        ctx!.strokeStyle = b.color;
        ctx!.shadowColor = b.glowColor;
        ctx!.shadowBlur = 14;
        ctx!.globalAlpha = b.opacity;
        ctx!.lineWidth = 1.8;
        ctx!.setLineDash([6, 6]);

        drawHexagon(ctx!, b.x, b.y, b.size, b.angle);
        ctx!.stroke();

        // Inner conjugated orbital ring
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.size * 0.44, 0, Math.PI * 2);
        ctx!.setLineDash([]);
        ctx!.lineWidth = 1.4;
        ctx!.stroke();

        // Orbiting satellite electron photon
        const ox = b.x + b.size * 0.44 * Math.cos(b.orbitAngle);
        const oy = b.y + b.size * 0.44 * Math.sin(b.orbitAngle);
        ctx!.beginPath();
        ctx!.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.shadowColor = "#ffffff";
        ctx!.shadowBlur = 10;
        ctx!.fill();

        // Vertex Carbon/Nitrogen Atoms
        for (let j = 0; j < 6; j++) {
          const a = b.angle + (j * Math.PI) / 3;
          const cx = b.x + b.size * Math.cos(a);
          const cy = b.y + b.size * Math.sin(a);

          ctx!.beginPath();
          ctx!.arc(cx, cy, 3.2, 0, Math.PI * 2);
          ctx!.fillStyle = b.color;
          ctx!.shadowColor = b.glowColor;
          ctx!.shadowBlur = 8;
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
        ctx!.globalAlpha = rip.opacity;
        ctx!.lineWidth = 3.2;
        ctx!.shadowColor = rip.color;
        ctx!.shadowBlur = 18;
        ctx!.stroke();
        ctx!.restore();
      }

      // 3. Update Nodes & Physics
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!reducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x <= 0 || node.x >= width) node.vx *= -1;
          if (node.y <= 0 || node.y >= height) node.vy *= -1;

          node.pulsePhase += node.pulseSpeed;
          node.radius = node.baseRadius + Math.sin(node.pulsePhase) * 0.9;
        }

        // Magnetic Force Field
        if (mouse.isHovered) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius && dist > 0) {
            const force = (1 - dist / mouse.radius) * 2.5;
            node.x -= (dx / dist) * force * 2.2;
            node.y -= (dy / dist) * force * 2.2;
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
            const alpha = Math.pow(1 - dist / maxDist, 1.25) * 0.65;

            let mouseBoost = 0;
            if (mouse.isHovered) {
              const midX = (n1.x + n2.x) / 2;
              const midY = (n1.y + n2.y) / 2;
              const mdx = mouse.x - midX;
              const mdy = mouse.y - midY;
              const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
              if (mDist < 140) {
                mouseBoost = (1 - mDist / 140) * 0.5;
              }
            }

            const finalAlpha = Math.min(alpha + mouseBoost, 0.98);

            ctx!.beginPath();
            ctx!.moveTo(n1.x, n1.y);
            ctx!.lineTo(n2.x, n2.y);

            const grad = ctx!.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
            grad.addColorStop(0, n1.color);
            grad.addColorStop(1, n2.color);

            ctx!.strokeStyle = grad;
            ctx!.globalAlpha = finalAlpha;
            ctx!.lineWidth = mouseBoost > 0.1 ? 2.2 : 1.3;
            ctx!.stroke();

            // Spawn data pulses
            if (!reducedMotion && pulses.length < 20 && Math.random() < 0.0008) {
              pulses.push({
                fromNode: i,
                toNode: j,
                progress: 0,
                speed: 0.022 + Math.random() * 0.03,
                color: n1.color,
              });
            }
          }
        }
      }

      // 5. Energy Photon Pulses
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
        ctx!.arc(px, py, 4, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 14;
        ctx!.globalAlpha = 1;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.fill();
        ctx!.restore();
      }

      // 6. Draw 3D Atom Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, Math.max(n.radius, 1.8), 0, Math.PI * 2);

        // Core atom
        ctx!.fillStyle = n.color;
        ctx!.shadowColor = n.glowColor;
        ctx!.shadowBlur = 14;
        ctx!.globalAlpha = 1;
        ctx!.fill();

        // Glowing outer corona
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.radius * 2.6, 0, Math.PI * 2);
        ctx!.fillStyle = n.glowColor;
        ctx!.globalAlpha = 0.32;
        ctx!.fill();

        // 3D Specular Highlight glint
        ctx!.beginPath();
        ctx!.arc(n.x - n.radius * 0.32, n.y - n.radius * 0.32, n.radius * 0.4, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.globalAlpha = 0.85;
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
