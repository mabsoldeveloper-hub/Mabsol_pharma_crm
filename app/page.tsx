"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";

const NAVY = "#343872";
const NAVY_DARK = "#1B1E42";
const ORANGE = "#fb8c00";
const ORANGE_LIGHT = "#ffb45c";
const SURFACE = "#F6F6FC";
const MUTED = "#6668A0";
const MUTED_SOFT = "#9496C4";
const GREEN = "#22C55E";
const BORDER = "#EEF0F8";

/* useLayoutEffect throws a warning during SSR, so fall back to useEffect there. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealState = "idle" | "hidden" | "visible";

/**
 * Reveal-on-scroll hook.
 * - Elements already inside the viewport on mount become visible immediately
 *   (no flash of invisible content on first paint).
 * - Elements below the fold start hidden and animate in once they intersect.
 */
function useReveal<T extends HTMLElement = HTMLElement>(
  threshold = 0.15
): [RefObject<T | null>, RevealState] {
  const ref = useRef<T | null>(null);
  // 'idle'    -> render exactly like the server (fully visible, no animation classes)
  // 'hidden'  -> below the fold, waiting to animate in
  // 'visible' -> revealed
  const [state, setState] = useState<RevealState>("idle");

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setState("visible");
      return undefined;
    }

    const rect = node.getBoundingClientRect();
    const alreadyInView =
      rect.top < window.innerHeight * (1 - threshold) && rect.bottom > 0;

    if (alreadyInView) {
      setState("visible");
      return undefined;
    }

    setState("hidden");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, state];
}

interface RevealProps {
  as?: ElementType;
  className?: string;
  delay?: number;
  children?: ReactNode;
  id?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  children,
  ...rest
}: RevealProps) {
  const [ref, state] = useReveal<HTMLElement>();
  const stateClass =
    state === "hidden" ? "reveal-hidden" : state === "visible" ? "reveal-in" : "";

  return (
    <Tag
      ref={ref}
      className={`reveal ${stateClass} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default function Home() {
  const bars = [30, 48, 40, 72, 54, 64, 46];
  const linePoints = "0,52 18,42 36,46 54,26 72,32 90,12 108,18 126,24";

  const notifs = [
    { title: "New Invoice Synced", sub: "From Marg · just now", tone: "orange" },
    { title: "Stock Report Ready", sub: "Updated 2 min ago", tone: "green" },
    { title: "Account Reconciled", sub: "5 min ago", tone: "navy" },
  ];

  const steps = [
    {
      n: "01",
      title: "Marg generates data",
      body: "Invoices, stock and accounts get created in Marg exactly like today. Nothing changes there.",
    },
    {
      n: "02",
      title: "Mabsol CRM syncs it",
      body: "Every change flows in on its own. No exports, no CSVs, no retyping numbers.",
    },
    {
      n: "03",
      title: "Your team sees it instantly",
      body: "Live reports and alerts land wherever your team already works.",
    },
  ];

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const node = frameRef.current;
    if (reducedMotion || !node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 12 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <>
      <main className="page">
        {/* NAVBAR */}
        <header className="nav">
          <div className="nav-inner">
            <span className="brand-text">Mabsol CRM</span>

            <nav className="nav-links">
              <a href="#product">Product</a>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
            </nav>

            <a
              href="https://phcrm.mabsolinfotech.cloud/login"
              className="btn btn-primary nav-btn"
            >
              Get Started
            </a>
          </div>
        </header>

        {/* HERO */}
        <section className="hero" id="product">
          <Reveal className="hero-copy">
            <span className="eyebrow">Marg Integration</span>
            <h1>
              Everything from Marg,
              <br />
              in <span className="accent">one screen</span>
            </h1>
            <p className="sub">
              Mabsol CRM pulls straight from Marg to give your team live
              reports and instant alerts, so nothing gets missed and no one
              has to dig for numbers.
            </p>
            <div className="hero-actions">
              <a
                href="https://phcrm.mabsolinfotech.cloud/login"
                className="btn btn-primary"
              >
                Get Started
              </a>
              <a href="#how" className="btn btn-outline">
                See how it works
              </a>
            </div>
          </Reveal>

          {/* PRODUCT SCREENSHOT / BENTO DASHBOARD — 3D TILT STAGE */}
          <Reveal className="hero-stage" delay={120}>
            <div className="stage-3d">
              <div className="ghost-panel" />

              <div
                className="browser-frame"
                ref={frameRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                }}
              >
                <div className="browser-top">
                  <div className="browser-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <span className="browser-url">app.mabsolinfotech.cloud</span>
                  <span className="live-pill">
                    <span className="live-dot" />
                    Live
                  </span>
                </div>

                <div className="bento">
                  <div className="bento-tile bento-sales">
                    <p className="tile-label">Sales Report</p>
                    <div className="mini-bars">
                      {bars.map((h, i) => (
                        <span key={i} style={{ height: `${h}%`, transitionDelay: `${i * 60}ms` }} />
                      ))}
                    </div>
                  </div>

                  <div className="bento-tile bento-stock">
                    <p className="tile-label">Stock Trend</p>
                    <svg viewBox="0 0 126 60" className="mini-line" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.35" />
                          <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,60 ${linePoints} 126,60`} fill="url(#fillGrad)" />
                      <polyline
                        points={linePoints}
                        fill="none"
                        stroke={ORANGE}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="tile-tag">+18%</span>
                  </div>

                  <div className="bento-tile bento-sync">
                    <p className="tile-label muted-on-dark">Sync Status</p>
                    <p className="sync-value">60s</p>
                    <p className="sync-caption">refresh from Marg</p>
                  </div>

                  <div className="bento-tile bento-notifs">
                    <p className="tile-label">Notifications</p>
                    <div className="notif-list">
                      {notifs.map((n) => (
                        <div className="notif-row" key={n.title}>
                          <span className={`notif-dot dot-${n.tone}`} />
                          <div>
                            <p className="notif-title">{n.title}</p>
                            <p className="notif-sub">{n.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="floating-toast">
                <span className="notif-dot dot-orange" />
                <div>
                  <p className="notif-title">Invoice #INV-2291 synced</p>
                  <p className="notif-sub">2 seconds ago</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* HOW IT WORKS — horizontal timeline */}
        <section className="how" id="how">
          <Reveal as="div" className="section-head">
            <span className="eyebrow eyebrow-dark">The flow</span>
            <h2>From Marg to your team, automatically</h2>
          </Reveal>

          <div className="timeline">
            <span className="timeline-line" aria-hidden="true" />
            {steps.map((s, i) => (
              <Reveal as="div" className="timeline-step" key={s.n} delay={i * 120}>
                <span className="timeline-node">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FEATURES — asymmetric bento */}
        <section className="feature-bento" id="features">
          <Reveal as="div" className="section-head">
            <span className="eyebrow eyebrow-dark">Inside the CRM</span>
            <h2>Built around one job: never lose track of Marg</h2>
          </Reveal>

          <div className="fb-grid">
            <Reveal as="div" className="fb-card fb-large">
              <div className="fb-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20V10M12 20V4M20 20v-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Report section</h3>
              <p>
                Sales, stock and account reports from Marg, laid out in one
                clean CRM view that&apos;s always current — no exports, no
                waiting on someone to send a file.
              </p>
              <div className="fb-visual">
                <div className="mini-bars mini-bars-large">
                  {bars.map((h, i) => (
                    <span key={i} style={{ height: `${h}%`, transitionDelay: `${i * 60}ms` }} />
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal as="div" className="fb-card" delay={120}>
              <div className="fb-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a5 5 0 0 0-5 5v3.5L5 15h14l-2-3.5V8a5 5 0 0 0-5-5Z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
                  <path d="M10 18a2 2 0 0 0 4 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Notifications</h3>
              <p>Know the second something changes in Marg, without opening two apps.</p>
            </Reveal>

            <Reveal as="div" className="fb-card" delay={220}>
              <div className="fb-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4v5h5M20 20v-5h-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4.6 15A8 8 0 0 0 19 15.5M19.4 9A8 8 0 0 0 5 8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Marg sync</h3>
              <p>Works with the Marg setup you already have. No migration, no new habits.</p>
            </Reveal>
          </div>
        </section>

        {/* CTA BAND */}
        <Reveal as="section" className="cta-band">
          <h2>Stop switching between Marg and spreadsheets</h2>
          <p>Set up takes minutes. Your team keeps working the same way, just with everything in view.</p>
          <a href="https://phcrm.mabsolinfotech.cloud/login" className="btn btn-primary">
            Get Started
          </a>
        </Reveal>

        {/* FOOTER */}
        <footer className="footer">
          <p>&copy; {new Date().getFullYear()} Mabsol CRM. Created by Mabsol Team.</p>
        </footer>
      </main>

      <style jsx global>{`
        .page {
          background: #ffffff;
          color: ${NAVY};
          font-family: var(--font-body, "Segoe UI"), Arial, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        h1, h2, h3, .brand-text, .tile-label, .live-pill, .notif-title {
          font-family: var(--font-display, "Segoe UI"), Arial, sans-serif;
        }

        .sync-value, .tile-tag, .timeline-node {
          font-family: var(--font-mono, monospace);
        }

        /* SCROLL REVEAL
           Base state matches the server-rendered markup exactly (fully visible,
           no transform) so there is never a flash of invisible content on load.
           Only elements confirmed to start below the fold get "reveal-hidden"
           applied client-side, and animate in via "reveal-in". */
        .reveal {
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .reveal-hidden {
          opacity: 0;
          transform: translateY(28px);
        }

        .reveal-in {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .browser-frame {
            transition: none !important;
          }
          .live-dot, .floating-toast {
            animation: none !important;
          }
        }

        /* NAVBAR */
        .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid ${BORDER};
        }

        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px clamp(16px, 4vw, 24px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand-text {
          font-size: clamp(16px, 2.4vw, 19px);
          font-weight: 700;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .nav-links {
          display: flex;
          gap: 28px;
          margin-right: auto;
          margin-left: 44px;
        }

        .nav-links a {
          color: ${MUTED};
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .nav-links a:hover {
          color: ${ORANGE};
        }

        .btn {
          display: inline-block;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }

        .btn:hover {
          transform: translateY(-2px);
        }

        .btn-primary {
          background: ${ORANGE};
          color: #fff;
          padding: 13px clamp(18px, 3vw, 30px);
          font-size: 15px;
          box-shadow: 0 10px 24px -10px rgba(251, 140, 0, 0.5);
        }

        .btn-outline {
          padding: 13px 24px;
          font-size: 15px;
          color: ${NAVY};
          border: 1px solid ${BORDER};
        }

        .btn-outline:hover {
          border-color: ${ORANGE};
          color: ${ORANGE};
        }

        .nav-btn {
          padding: 10px clamp(14px, 3vw, 22px);
          font-size: 14px;
        }

        /* HERO */
        .hero {
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(48px, 8vw, 72px) 24px 40px;
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 40px;
          align-items: center;
        }

        .eyebrow {
          display: inline-block;
          padding: 6px 13px;
          border-radius: 999px;
          background: #fff3e2;
          color: ${ORANGE};
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 20px;
        }

        h1 {
          margin: 0 0 18px;
          font-size: clamp(28px, 4.4vw, 40px);
          line-height: 1.18;
          font-weight: 700;
          letter-spacing: -0.015em;
        }

        .accent {
          color: ${ORANGE};
        }

        .sub {
          max-width: 400px;
          margin-bottom: 30px;
          color: ${MUTED};
          font-size: 16px;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }

        /* 3D STAGE */
        .hero-stage {
          perspective: 1600px;
        }

        .stage-3d {
          position: relative;
        }

        .ghost-panel {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: linear-gradient(160deg, #2a2e63, #1f2250);
          opacity: 0.5;
          transform: rotateY(10deg) rotateX(-4deg) translate3d(20px, 22px, -80px);
          box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.55);
        }

        .browser-frame {
          position: relative;
          border-radius: 16px;
          border: 1px solid ${BORDER};
          background: #fff;
          box-shadow: 0 40px 70px -30px rgba(52, 56, 114, 0.35);
          overflow: hidden;
          transition: transform 0.15s ease-out;
          will-change: transform;
        }

        .browser-top {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-bottom: 1px solid ${BORDER};
        }

        .browser-dots {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d8dbef;
        }

        .browser-url {
          font-size: 12px;
          color: ${MUTED_SOFT};
          background: ${SURFACE};
          padding: 4px 12px;
          border-radius: 999px;
        }

        .live-pill {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          background: #eef9f0;
          color: ${NAVY};
          padding: 4px 10px;
          border-radius: 999px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${GREEN};
          animation: pulse 1.8s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        .bento {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          grid-template-rows: auto auto;
          gap: 1px;
          background: ${BORDER};
        }

        .bento-tile {
          background: #fff;
          padding: 18px 20px;
        }

        .tile-label {
          margin: 0 0 12px;
          font-size: 12.5px;
          font-weight: 700;
        }

        .mini-bars {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 64px;
        }

        .mini-bars span {
          flex: 1;
          border-radius: 3px 3px 0 0;
          background: linear-gradient(180deg, ${ORANGE_LIGHT}, ${ORANGE});
          transform: scaleY(1);
          transform-origin: bottom;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        :global(.reveal-hidden) .mini-bars span {
          transform: scaleY(0);
        }

        .bento-stock {
          position: relative;
        }

        .mini-line {
          width: 100%;
          height: 62px;
        }

        .tile-tag {
          position: absolute;
          top: 18px;
          right: 20px;
          font-size: 11px;
          font-weight: 600;
          color: ${GREEN};
          background: #eef9f0;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .bento-sync {
          background: linear-gradient(160deg, ${NAVY_DARK}, ${NAVY});
        }

        .muted-on-dark {
          color: #b6b8e6;
        }

        .sync-value {
          margin: 0;
          font-size: 30px;
          font-weight: 600;
          color: #fff;
        }

        .sync-caption {
          margin: 2px 0 0;
          font-size: 12px;
          color: #9496c4;
        }

        .notif-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notif-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .notif-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 4px;
          flex-shrink: 0;
        }

        .dot-orange { background: ${ORANGE}; }
        .dot-green { background: ${GREEN}; }
        .dot-navy { background: ${NAVY}; }

        .notif-title {
          margin: 0;
          font-size: 12.5px;
          font-weight: 600;
        }

        .notif-sub {
          margin: 2px 0 0;
          font-size: 11px;
          color: ${MUTED_SOFT};
        }

        .floating-toast {
          position: absolute;
          left: -8%;
          bottom: -28px;
          width: 210px;
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid ${BORDER};
          border-radius: 12px;
          box-shadow: 0 22px 40px -18px rgba(6, 8, 30, 0.45);
          animation: floatIdle 4.5s ease-in-out infinite;
        }

        @keyframes floatIdle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        /* HOW IT WORKS — TIMELINE */
        .how {
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(64px, 10vw, 96px) 24px 20px;
        }

        .section-head {
          text-align: center;
          margin-bottom: 56px;
        }

        .eyebrow-dark {
          background: #fff3e2;
          color: ${ORANGE};
        }

        .section-head h2 {
          margin: 14px 0 0;
          font-size: clamp(22px, 3.6vw, 30px);
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .timeline {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }

        .timeline-line {
          position: absolute;
          top: 19px;
          left: 8%;
          right: 8%;
          height: 1px;
          background: ${BORDER};
        }

        .timeline-step {
          position: relative;
          text-align: center;
          padding: 0 12px;
        }

        .timeline-node {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${NAVY};
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 18px;
        }

        .timeline-step h3 {
          margin: 0 0 8px;
          font-size: 17px;
        }

        .timeline-step p {
          margin: 0 auto;
          max-width: 260px;
          font-size: 14px;
          line-height: 1.65;
          color: ${MUTED};
        }

        /* FEATURE BENTO */
        .feature-bento {
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(60px, 9vw, 90px) 24px;
        }

        .fb-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          grid-template-rows: repeat(2, auto);
          gap: 18px;
          perspective: 1000px;
        }

        .fb-card {
          border: 1px solid ${BORDER};
          border-radius: 16px;
          padding: 28px;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, border-color 0.35s ease;
        }

        .fb-card:hover {
          transform: translateY(-6px) rotateX(3deg) rotateY(-2deg);
          border-color: ${ORANGE};
          box-shadow: 0 26px 48px -26px rgba(52, 56, 114, 0.35);
        }

        .fb-large {
          grid-row: span 2;
          display: flex;
          flex-direction: column;
        }

        .fb-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: linear-gradient(160deg, ${NAVY}, ${NAVY_DARK});
          margin-bottom: 16px;
        }

        .fb-card h3 {
          margin: 0 0 8px;
          font-size: 17px;
        }

        .fb-card p {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.65;
          color: ${MUTED};
        }

        .fb-visual {
          margin-top: auto;
          padding-top: 24px;
        }

        .mini-bars-large {
          height: 96px;
          gap: 12px;
        }

        /* CTA BAND — centered on every screen size, padding instead of fixed
           side margins so it stays properly responsive */
        .cta-band {
          display: block;
          box-sizing: border-box;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto 80px;
          padding: clamp(44px, 7vw, 64px) clamp(20px, 5vw, 40px);
          border-radius: 20px;
          background: linear-gradient(150deg, ${NAVY_DARK}, ${NAVY});
          text-align: center;
        }

        .cta-band h2 {
          margin: 0 0 12px;
          color: #fff;
          font-size: clamp(22px, 3.6vw, 28px);
          font-weight: 700;
        }

        .cta-band p {
          margin: 0 auto 28px;
          max-width: 440px;
          color: #c3c4e6;
          font-size: 15px;
          line-height: 1.6;
        }

        /* FOOTER */
        .footer {
          border-top: 1px solid ${BORDER};
          padding: 26px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .footer p {
          margin: 0;
          font-size: 13px;
          color: ${MUTED_SOFT};
        }

        /* RESPONSIVE */
        @media (max-width: 960px) {
          .hero {
            grid-template-columns: 1fr;
            padding-top: 44px;
          }

          .bento {
            grid-template-columns: 1fr;
          }

          .nav-links {
            display: none;
          }

          .timeline {
            grid-template-columns: 1fr;
            gap: 40px;
            padding-left: 8px;
          }

          .timeline-line {
            display: none;
          }

          .timeline-step {
            text-align: left;
            padding-left: 20px;
            border-left: 1px solid ${BORDER};
          }

          .timeline-step p {
            margin: 0;
          }

          .fb-grid {
            grid-template-columns: 1fr;
          }

          .fb-large {
            grid-row: auto;
          }

          .cta-band {
            width: calc(100% - 32px);
            margin: 0 auto 60px;
          }

          .floating-toast {
            left: 12px;
            bottom: -24px;
            width: 190px;
          }
        }

        @media (max-width: 520px) {
          .nav-inner {
            padding: 14px 16px;
          }

          .hero {
            padding-left: 16px;
            padding-right: 16px;
          }

          .sub {
            max-width: 100%;
          }

          .hero-actions {
            width: 100%;
          }

          .hero-actions .btn {
            flex: 1;
            text-align: center;
          }

          .browser-url {
            display: none;
          }

          .floating-toast {
            width: 168px;
            padding: 10px 12px;
          }

          .notif-title {
            font-size: 12px;
          }

          .feature-bento, .how {
            padding-left: 16px;
            padding-right: 16px;
          }

          .cta-band {
            width: calc(100% - 24px);
          }
        }
      `}</style>
    </>
  );
}