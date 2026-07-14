"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";

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

export default function LandingPage() {
  const bars = [30, 48, 40, 72, 54, 64, 46];
  const linePoints = "0,52 18,42 36,46 54,26 72,32 90,12 108,18 126,24";

  const notifs = [
    { title: "New Invoice Synced", sub: "From ERP · just now", tone: "orange" },
    { title: "Stock Report Ready", sub: "Updated 2 min ago", tone: "green" },
    { title: "Account Reconciled", sub: "5 min ago", tone: "navy" },
  ];

  const steps = [
    {
      n: "01",
      title: "ERP generates data",
      body: "Invoices, stock and accounts get created in ERP exactly like today. Nothing changes there.",
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <main className="landing-page">
      {/* NAVBAR */}
      <header className="nav">
        <div className="nav-inner">
          <span className="brand-text">Mabsol Infotech</span>

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
          <span className="eyebrow">ERP Integration</span>
          <h1>
            Everything from ERP,
            <br />
            in <span className="accent">one screen</span>
          </h1>
          <p className="sub">
            Mabsol CRM pulls straight from ERP to give your team live
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
                        <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--orange)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`0,60 ${linePoints} 126,60`} fill="url(#fillGrad)" />
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="var(--orange)"
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
                  <p className="sync-caption">refresh from ERP</p>
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
          <h2>From ERP to your team, automatically</h2>
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
          <h2>Built around one job: never lose track of ERP</h2>
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
              Sales, stock and account reports from ERP, laid out in one
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
            <p>Know the second something changes in ERP, without opening two apps.</p>
          </Reveal>

          <Reveal as="div" className="fb-card" delay={220}>
            <div className="fb-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 4v5h5M20 20v-5h-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.6 15A8 8 0 0 0 19 15.5M19.4 9A8 8 0 0 0 5 8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>ERP sync</h3>
            <p>Works with the ERP setup you already have. No migration, no new habits.</p>
          </Reveal>
        </div>
      </section>

      {/* CTA BAND */}
      <Reveal as="section" className="cta-band">
        <h2>Stop switching between ERP and spreadsheets</h2>
        <p>Set up takes minutes. Your team keeps working the same way, just with everything in view.</p>
        <a href="https://phcrm.mabsolinfotech.cloud/login" className="btn btn-primary">
          Get Started
        </a>
      </Reveal>

      {/* FOOTER */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Mabsol Infotech. Created by Mabsol Team.</p>
      </footer>
    </main>
  );
}
