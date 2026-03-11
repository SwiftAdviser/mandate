import { useState, useEffect, useRef } from 'react';

/* ── Nav links ───────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'How it works', href: '#capabilities' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Docs', href: '#' },
];

/* ── Stats data ──────────────────────────────────────────────────────────── */
const STATS = [
  { value: 2847, suffix: '', label: 'agents protected', decimals: 0 },
  { value: 12.4, suffix: 'M', label: 'in spend controlled', prefix: '$', decimals: 1 },
  { value: 50, suffix: 'ms', label: 'validation', prefix: '< ', decimals: 0 },
  { value: 99.97, suffix: '%', label: 'uptime', decimals: 2 },
];

/* ── Capabilities ────────────────────────────────────────────────────────── */
const CAPABILITIES = [
  {
    num: '01',
    title: 'Spend Controls',
    description: 'Set a daily budget. Cap destinations. Per-tx limits. No changes to your agent code.',
    tags: ['$200/day', 'allowlists', 'per-tx caps'],
    featured: true,
  },
  {
    num: '02',
    title: 'Circuit Breaker',
    description: 'One API call freezes all activity. Auto-trips on anomaly at 3am. Full audit trail.',
    tags: ['< 50ms', 'auto-trips'],
    featured: false,
  },
  {
    num: '03',
    title: 'Human-in-the-Loop',
    description: 'Transactions above threshold wait for human approval. Slack, webhook, or email.',
    tags: ['Any threshold', 'Slack · webhook'],
    featured: false,
  },
];

/* ── Build items ─────────────────────────────────────────────────────────── */
const BUILD_ITEMS = [
  {
    num: '01',
    title: 'Autonomous DeFi',
    description: 'Monitor yields across protocols, execute trades on Base, and rebalance liquidity 24/7. Agent detects a better opportunity at 3am — it acts immediately, because you already set the rules.',
  },
  {
    num: '02',
    title: 'The Machine Economy',
    description: 'Agents that pay for their own compute, data, and storage using the x402 protocol. Acquire API keys, purchase premium data streams, pay for storage — entirely autonomously.',
  },
  {
    num: '03',
    title: 'Agentic Commerce',
    description: 'Participate in creator economies. Send payments between agents and users. Monetize agent-generated content — all without manual approval on every transaction.',
  },
  {
    num: '04',
    title: 'Multi-Chain Operations',
    description: 'Deploy on Base, manage positions wherever opportunities exist. One policy set, enforced across every chain your agent touches.',
  },
];

/* ── Pricing ─────────────────────────────────────────────────────────────── */
const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: ['1 agent', '500 tx/month', 'Community support', 'All EVM chains + Solana'],
    cta: 'Start building →',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/mo',
    features: ['10 agents', '50k tx/month', 'Slack alerts', 'Priority support', 'Custom policies'],
    cta: 'Get started →',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited agents', 'SLA guarantee', 'Dedicated support', 'On-prem option'],
    cta: 'Talk to us →',
    highlight: false,
    badge: null,
  },
];

/* ── Kinetic counter hook ────────────────────────────────────────────────── */
function useKineticCounter(target: number, decimals: number, started: boolean) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number>(0);

  useEffect(() => {
    if (!started) return;
    const duration = 1800;
    start.current = performance.now();

    function tick(now: number) {
      const elapsed = now - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, decimals, started]);

  return val;
}

/* ── Single stat counter ─────────────────────────────────────────────────── */
function StatCounter({
  value, suffix, label, prefix = '', decimals, started,
}: {
  value: number; suffix: string; label: string;
  prefix?: string; decimals: number; started: boolean;
}) {
  const count = useKineticCounter(value, decimals, started);
  const display = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString();

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-jet)',
        fontSize: 'clamp(20px, 2.5vw, 28px)',
        fontWeight: 500,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {prefix}{display}{suffix}
      </div>
      <div style={{
        fontFamily: 'var(--font-jet)',
        fontSize: 11,
        color: 'var(--text-dim)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

/* ── Stats bar ───────────────────────────────────────────────────────────── */
function StatsBar() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      borderTop: '1px solid var(--border-hair)',
      borderBottom: '1px solid var(--border-hair)',
      padding: '28px 0',
      background: 'rgba(15,17,21,0.5)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        gap: 32, flexWrap: 'wrap',
      }}>
        {STATS.map((s) => (
          <StatCounter key={s.label} {...s} started={visible} />
        ))}
      </div>
    </div>
  );
}

/* ── CardIncident (from original Landing.tsx) ────────────────────────────── */
function CardIncident({ blocked }: { blocked: boolean }) {
  const accent    = blocked ? 'var(--green)'     : 'var(--red)';
  const accentDim = blocked ? 'var(--green-dim)' : 'var(--red-dim)';
  const accentBg  = blocked ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)';
  const resultBg  = blocked ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)';
  const shadow    = blocked
    ? '0 0 48px rgba(16,185,129,0.08), 0 24px 64px rgba(0,0,0,0.5)'
    : '0 0 48px rgba(239,68,68,0.10), 0 24px 64px rgba(0,0,0,0.5)';

  return (
    <div style={{
      fontFamily: 'var(--font-jet)', fontSize: 13, lineHeight: 1.7,
      border: `1px solid ${accentDim}`, borderLeft: `3px solid ${accent}`,
      borderRadius: 8,
      background: 'rgba(15,17,21,0.85)',
      backdropFilter: 'blur(12px)',
      boxShadow: shadow,
    }}>
      <div style={{
        background: accentBg, borderBottom: `1px solid ${accentDim}`,
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: '8px 8px 0 0',
      }}>
        <span style={{ color: accent, fontWeight: 500, letterSpacing: '0.02em' }}>
          {blocked ? '✓ BLOCKED' : '⚠ INCIDENT'} — 14:32:07
        </span>
        {blocked && (
          <span style={{
            fontSize: 10, color: 'var(--text-dim)',
            border: '1px solid var(--border-hair)', borderRadius: 3,
            padding: '1px 6px', letterSpacing: '0.06em',
          }}>mandate</span>
        )}
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {([
          ['Agent',   'trading-bot-v2',                                          'secondary'],
          ['Action',  'transfer() → 0xdeadbeef…c4f2',                           'secondary'],
          ['Amount',  '$4,200.00',                                               'primary'],
          [blocked ? 'Rule' : 'Trigger',
           blocked ? 'recipient not on allowlist' : 'prompt injection detected', 'accent'],
        ] as [string, string, string][]).map(([label, value, kind], i) => (
          <div key={i}>
            <span style={{ color: 'var(--text-dim)' }}>{label}:</span>{' '}
            <span style={{
              color: kind === 'primary' ? 'var(--text-primary)'
                   : kind === 'accent'  ? accent
                   : 'var(--text-secondary)',
            }}>{value}</span>
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${accentDim}`, margin: '10px 0' }} />

        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          {blocked ? (
            <span style={{ fontSize: 11, color: 'var(--green)', letterSpacing: '0.05em' }}>● POLICY: allowlist enforced</span>
          ) : (
            <>
              <span style={{ fontSize: 11, color: 'var(--red)', letterSpacing: '0.05em' }}>● NO POLICY</span>
              <span style={{ fontSize: 11, color: 'var(--red)', letterSpacing: '0.05em' }}>● NO CIRCUIT BREAKER</span>
            </>
          )}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '10px 14px', background: resultBg,
          borderRadius: 5, border: `1px solid ${accentDim}`,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>Transaction</div>
            <div style={{ fontWeight: 600, color: accent, letterSpacing: '0.04em' }}>
              {blocked ? 'BLOCKED  ✗' : 'EXECUTED  ✓'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>Funds</div>
            <div style={{ fontWeight: 600, color: accent }}>
              {blocked ? 'SAFE' : 'UNRECOVERABLE'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── IncidentCardFlipper (from original Landing.tsx) ─────────────────────── */
function IncidentCardFlipper() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIsBlocked(v => !v), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'flex-end' }}>
        {(['without', 'with mandate'] as const).map((label, i) => {
          const active = i === 0 ? !isBlocked : isBlocked;
          const c = i === 0 ? 'var(--red)' : 'var(--green)';
          const cDim = i === 0 ? 'var(--red-dim)' : 'var(--green-dim)';
          return (
            <span key={label} style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11,
              fontFamily: 'var(--font-jet)', letterSpacing: '0.06em',
              background: active ? (i === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)') : 'transparent',
              border: `1px solid ${active ? cDim : 'var(--border-hair)'}`,
              color: active ? c : 'var(--text-dim)',
              transition: 'all 0.4s ease',
            }}>{label}</span>
          );
        })}
      </div>

      <div style={{ display: 'grid' }}>
        <div style={{ gridArea: '1/1', opacity: isBlocked ? 0 : 1, transition: 'opacity 0.6s ease', pointerEvents: isBlocked ? 'none' : 'auto' }}>
          <CardIncident blocked={false} />
        </div>
        <div style={{ gridArea: '1/1', opacity: isBlocked ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: isBlocked ? 'auto' : 'none' }}>
          <CardIncident blocked={true} />
        </div>
      </div>
    </div>
  );
}

/* ── Section reveal hook ─────────────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ── Navbar ──────────────────────────────────────────────────────────────── */
function Navbar({ opaque }: { opaque: boolean }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: opaque ? 'rgba(8,12,16,0.97)' : 'rgba(8,12,16,0.6)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${opaque ? 'var(--border-hair)' : 'transparent'}`,
      transition: 'background 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.35s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-space)',
            fontSize: 20, fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}>mandate</span>
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-jet)',
            background: 'var(--glow-orange)',
            color: 'var(--btc-orange)',
            border: '1px solid rgba(247,147,26,0.3)',
            borderRadius: 3, padding: '2px 6px',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>beta</span>
        </div>

        {/* Center links */}
        <div className="nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} className="nav-link" style={{
              color: 'var(--text-secondary)', textDecoration: 'none',
              fontSize: 14, fontFamily: 'var(--font-inter)',
              transition: 'color 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}>{label}</a>
          ))}
        </div>

        {/* CTA */}
        <a href="/dashboard" className="btn-orange" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 20px',
          background: 'linear-gradient(135deg, #F7931A, #ea580c)',
          color: '#080c10',
          fontFamily: 'var(--font-space)', fontSize: 13, fontWeight: 700,
          textDecoration: 'none',
          borderRadius: 999,
          letterSpacing: '-0.01em',
          boxShadow: '0 2px 16px rgba(247,147,26,0.2)',
          transition: 'box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
          cursor: 'pointer',
        }}>Launch App →</a>
      </div>
    </nav>
  );
}

/* ── Main landing page ───────────────────────────────────────────────────── */
export default function LandingV3() {
  const [navOpaque, setNavOpaque] = useState(false);
  const { ref: capsRef, visible: capsVisible } = useReveal();
  const { ref: buildRef, visible: buildVisible } = useReveal();
  const { ref: pricingRef, visible: pricingVisible } = useReveal();
  const { ref: ctaRef, visible: ctaVisible } = useReveal();

  useEffect(() => {
    const handleScroll = () => setNavOpaque(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const wrap: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' };

  return (
    <div style={{ background: 'var(--void)', minHeight: '100dvh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --btc-orange: #F7931A;
          --btc-gold: #FFD600;
          --void: #080c10;
          --surface: #0F1115;
          --border-hair: rgba(30, 41, 59, 0.5);
          --glow-orange: rgba(247, 147, 26, 0.12);
          --font-space: 'Space Grotesk', sans-serif;
          --font-inter: 'Inter', sans-serif;
          --font-jet: 'JetBrains Mono', monospace;
        }

        /* Nav hover */
        .nav-link:hover { color: var(--text-primary) !important; }

        /* Orange pill button */
        .btn-orange:hover {
          box-shadow: 0 4px 28px rgba(247,147,26,0.38) !important;
          transform: translateY(-1px) !important;
        }
        .btn-orange:active {
          transform: scale(0.98) !important;
          box-shadow: 0 2px 12px rgba(247,147,26,0.25) !important;
        }

        /* Outline pill button */
        .btn-outline:hover {
          border-color: rgba(247,147,26,0.5) !important;
          color: var(--text-primary) !important;
        }
        .btn-outline:active { transform: scale(0.98) !important; }

        /* Reveal animation */
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal.d1 { transition-delay: 0.05s; }
        .reveal.d2 { transition-delay: 0.12s; }
        .reveal.d3 { transition-delay: 0.19s; }
        .reveal.d4 { transition-delay: 0.26s; }

        /* Capability card hover */
        .cap-card:hover {
          border-color: rgba(247,147,26,0.22) !important;
          background: rgba(15,17,21,0.95) !important;
        }

        /* Pricing card hover */
        .price-card:hover { transform: translateY(-3px); }
        .price-card { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); }

        /* Build item hover */
        .build-item:hover .build-num { color: var(--btc-orange) !important; }
        .build-num { transition: color 0.2s ease; }

        /* Mobile */
        @media (max-width: 768px) {
          .hero-grid      { flex-direction: column !important; }
          .hero-right     { width: 100% !important; margin-top: 48px; }
          .nav-links      { display: none !important; }
          .caps-grid      { grid-template-columns: 1fr !important; }
          .build-grid     { grid-template-columns: 1fr !important; }
          .pricing-grid   { grid-template-columns: 1fr !important; max-width: 100% !important; }
          .stats-row      { gap: 24px !important; }
          .footer-inner   { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
        }

        /* Pulse dot */
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

      <Navbar opaque={navOpaque} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100dvh', paddingTop: 60,
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glows */}
        <div style={{
          position: 'absolute', top: '10%', left: '-15%',
          width: 800, height: 800,
          background: 'radial-gradient(circle, rgba(247,147,26,0.04) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-10%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(239,68,68,0.03) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ ...wrap, width: '100%', paddingTop: 80, paddingBottom: 80 }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 64 }}>

            {/* Left 55% — copy */}
            <div style={{ flex: '0 0 55%', maxWidth: 600 }}>
              {/* Label */}
              <div className="fade-up fade-up-1" style={{
                fontFamily: 'var(--font-space)', fontSize: 11,
                color: 'var(--btc-orange)', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 28,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="pulse-dot" style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--btc-orange)',
                }} />
                Policy engine for autonomous agents
              </div>

              {/* H1 */}
              <h1 className="fade-up fade-up-2" style={{
                fontFamily: 'var(--font-space)',
                fontSize: 'clamp(40px, 5.5vw, 68px)',
                fontWeight: 700,
                lineHeight: 0.92,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                margin: '0 0 28px',
              }}>
                Give your agent<br />
                <span style={{ color: 'var(--btc-orange)' }}>money.</span>{' '}
                Sleep fine.
              </h1>

              {/* Divider */}
              <div style={{
                width: '100%', height: 1,
                background: 'linear-gradient(90deg, rgba(247,147,26,0.2) 0%, transparent 70%)',
                marginBottom: 20,
              }} />

              {/* Mini stats row */}
              <div className="fade-up fade-up-3" style={{
                display: 'flex', gap: 28, marginBottom: 28, flexWrap: 'wrap',
              }}>
                {[
                  { val: '2,847', lbl: 'agents' },
                  { val: '$12.4M', lbl: 'controlled' },
                  { val: '99.97%', lbl: 'uptime' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{
                      fontFamily: 'var(--font-jet)', fontSize: 16, fontWeight: 500,
                      color: 'var(--text-primary)', letterSpacing: '-0.02em',
                    }}>{val}</span>
                    <span style={{
                      fontFamily: 'var(--font-jet)', fontSize: 10,
                      color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{lbl}</span>
                  </div>
                ))}
              </div>

              {/* Subtext */}
              <p className="fade-up fade-up-3" style={{
                fontFamily: 'var(--font-inter)', fontSize: 17, lineHeight: 1.65,
                color: 'var(--text-secondary)',
                fontWeight: 300,
                margin: '0 0 36px', maxWidth: 480,
              }}>
                Mandate enforces spend policy before the key is touched.{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 400 }}>Not a wallet — a control plane.</span>
              </p>

              {/* CTA row */}
              <div className="fade-up fade-up-4" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <a href="/dashboard" className="btn-orange" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #F7931A, #ea580c)',
                  color: '#080c10',
                  fontFamily: 'var(--font-space)', fontSize: 15, fontWeight: 700,
                  textDecoration: 'none',
                  borderRadius: 999,
                  boxShadow: '0 4px 24px rgba(247,147,26,0.25)',
                  transition: 'box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                  cursor: 'pointer',
                }}>Set up policies →</a>

                <a href="#capabilities" style={{
                  fontFamily: 'var(--font-inter)', fontSize: 14,
                  color: 'var(--text-dim)', textDecoration: 'none',
                  letterSpacing: '0.01em',
                  transition: 'color 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                >How it works ↓</a>
              </div>

              {/* Trust line */}
              <div className="fade-up fade-up-5" style={{
                fontFamily: 'var(--font-jet)', fontSize: 11,
                color: 'var(--text-dim)', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--green)', display: 'inline-block',
                  boxShadow: '0 0 6px rgba(16,185,129,0.5)',
                }} />
                Non-custodial · EVM + Solana · 15 min setup
              </div>
            </div>

            {/* Right 45% — incident card */}
            <div className="hero-right fade-up" style={{
              flex: 1, minWidth: 0,
              animationDelay: '0.25s',
            }}>
              <IncidentCardFlipper />
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <StatsBar />

      {/* ── Capabilities ──────────────────────────────────────────────────── */}
      <section id="capabilities" style={{ padding: '104px 0' }}>
        <div style={wrap} ref={capsRef}>
          <div style={{ marginBottom: 56 }}>
            <div className={`reveal${capsVisible ? ' visible' : ''}`} style={{
              fontFamily: 'var(--font-jet)', fontSize: 11,
              color: 'var(--btc-orange)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>
              What Mandate Does
            </div>
            <h2 className={`reveal d1${capsVisible ? ' visible' : ''}`} style={{
              fontFamily: 'var(--font-space)',
              fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
              color: 'var(--text-primary)', margin: 0,
            }}>
              Three primitives.<br />Complete control.
            </h2>
          </div>

          {/* Asymmetric 2fr 1fr grid */}
          <div className={`caps-grid reveal d2${capsVisible ? ' visible' : ''}`} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: 16,
          }}>
            {/* Featured large card */}
            {CAPABILITIES.filter(c => c.featured).map(({ num, title, description, tags }) => (
              <div key={num} className="cap-card" style={{
                gridRow: '1 / 3',
                background: 'rgba(15,17,21,0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(247,147,26,0.1)',
                borderRadius: 12,
                padding: '40px 36px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                cursor: 'default',
                transition: 'border-color 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s cubic-bezier(0.16,1,0.3,1)',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Subtle glow corner */}
                <div style={{
                  position: 'absolute', top: -40, right: -40,
                  width: 200, height: 200,
                  background: 'radial-gradient(circle, rgba(247,147,26,0.06) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />

                <div>
                  <div style={{
                    fontFamily: 'var(--font-jet)', fontSize: 11,
                    color: 'var(--btc-orange)', letterSpacing: '0.12em',
                    textTransform: 'uppercase', marginBottom: 20,
                    opacity: 0.8,
                  }}>{num}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-space)',
                    fontSize: 'clamp(28px, 3vw, 40px)',
                    fontWeight: 700, letterSpacing: '-0.03em',
                    color: 'var(--text-primary)', margin: '0 0 20px',
                    lineHeight: 1.1,
                  }}>{title}</h3>
                  <p style={{
                    fontFamily: 'var(--font-inter)', fontSize: 16,
                    color: 'var(--text-secondary)', lineHeight: 1.7,
                    margin: '0 0 32px', maxWidth: 380, fontWeight: 300,
                  }}>{description}</p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      fontFamily: 'var(--font-jet)', fontSize: 12,
                      color: 'var(--btc-orange)',
                      background: 'rgba(247,147,26,0.08)',
                      border: '1px solid rgba(247,147,26,0.2)',
                      borderRadius: 999,
                      padding: '4px 12px',
                      letterSpacing: '0.02em',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Two small stacked cards */}
            {CAPABILITIES.filter(c => !c.featured).map(({ num, title, description, tags }) => (
              <div key={num} className="cap-card" style={{
                background: 'rgba(15,17,21,0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(247,147,26,0.08)',
                borderRadius: 12,
                padding: '28px 28px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                cursor: 'default',
                transition: 'border-color 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s cubic-bezier(0.16,1,0.3,1)',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-jet)', fontSize: 10,
                    color: 'var(--btc-orange)', letterSpacing: '0.12em',
                    textTransform: 'uppercase', marginBottom: 14,
                    opacity: 0.7,
                  }}>{num}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-space)',
                    fontSize: 22,
                    fontWeight: 700, letterSpacing: '-0.025em',
                    color: 'var(--text-primary)', margin: '0 0 12px',
                  }}>{title}</h3>
                  <p style={{
                    fontFamily: 'var(--font-inter)', fontSize: 14,
                    color: 'var(--text-secondary)', lineHeight: 1.65,
                    margin: '0 0 20px', fontWeight: 300,
                  }}>{description}</p>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      fontFamily: 'var(--font-jet)', fontSize: 11,
                      color: 'var(--amber)',
                      opacity: 0.7,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Can Build ────────────────────────────────────────────── */}
      <section style={{
        padding: '104px 0',
        borderTop: '1px solid var(--border-hair)',
        background: 'rgba(15,17,21,0.4)',
      }}>
        <div style={wrap} ref={buildRef}>
          <div className={`reveal${buildVisible ? ' visible' : ''}`} style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: 'var(--font-jet)', fontSize: 11,
              color: 'var(--btc-orange)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>
              What You Can Build
            </div>
            <h2 style={{
              fontFamily: 'var(--font-space)',
              fontSize: 'clamp(26px, 3vw, 44px)',
              fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
              margin: '0 0 56px', color: 'var(--text-primary)',
            }}>
              Once agents can hold money,<br />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>entirely new categories emerge.</span>
            </h2>
          </div>

          {/* Alternating masonry — not equal columns */}
          <div className={`build-grid reveal d1${buildVisible ? ' visible' : ''}`} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0 80px',
          }}>
            {BUILD_ITEMS.map(({ num, title, description }, idx) => (
              <div key={num} className="build-item" style={{
                borderTop: '1px solid var(--border-hair)',
                paddingTop: 32,
                paddingBottom: 52,
                marginTop: idx === 1 || idx === 3 ? 40 : 0,
              }}>
                <div className="build-num" style={{
                  fontFamily: 'var(--font-jet)', fontSize: 11,
                  color: 'var(--text-dim)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 14,
                }}>{num}</div>
                <h3 style={{
                  fontFamily: 'var(--font-space)', fontSize: 22,
                  fontWeight: 700, letterSpacing: '-0.025em',
                  color: 'var(--text-primary)', margin: '0 0 14px',
                }}>{title}</h3>
                <p style={{
                  fontFamily: 'var(--font-inter)', fontSize: 15,
                  color: 'var(--text-secondary)', lineHeight: 1.7,
                  margin: 0, fontWeight: 300,
                }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{
        padding: '104px 0',
        borderTop: '1px solid var(--border-hair)',
      }}>
        <div style={wrap} ref={pricingRef}>
          <div className={`reveal${pricingVisible ? ' visible' : ''}`} style={{ marginBottom: 56 }}>
            <div style={{
              fontFamily: 'var(--font-jet)', fontSize: 11,
              color: 'var(--btc-orange)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>
              Pricing
            </div>
            <h2 style={{
              fontFamily: 'var(--font-space)',
              fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
              margin: 0, color: 'var(--text-primary)',
            }}>
              Start free. Scale when ready.
            </h2>
          </div>

          <div className={`pricing-grid reveal d1${pricingVisible ? ' visible' : ''}`} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            maxWidth: 960,
            margin: '0 auto',
          }}>
            {PRICING.map(tier => (
              <div key={tier.name} className="price-card" style={{
                background: tier.highlight
                  ? 'linear-gradient(135deg, rgba(247,147,26,0.08), rgba(247,147,26,0.03))'
                  : 'rgba(15,17,21,0.8)',
                backdropFilter: 'blur(12px)',
                border: tier.highlight
                  ? '1px solid rgba(247,147,26,0.4)'
                  : '1px solid var(--border-hair)',
                borderRadius: 12,
                padding: '32px 28px',
                boxShadow: tier.highlight
                  ? '0 0 48px rgba(247,147,26,0.08), 0 4px 32px rgba(0,0,0,0.4)'
                  : '0 4px 24px rgba(0,0,0,0.3)',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
              }}>
                {tier.badge && (
                  <div style={{
                    position: 'absolute', top: -1, right: 20,
                    fontFamily: 'var(--font-jet)', fontSize: 10,
                    color: 'var(--btc-orange)', letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'rgba(247,147,26,0.12)',
                    border: '1px solid rgba(247,147,26,0.3)',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    padding: '3px 12px',
                  }}>{tier.badge}</div>
                )}

                <div style={{
                  fontFamily: 'var(--font-space)', fontSize: 13, fontWeight: 600,
                  color: tier.highlight ? 'var(--btc-orange)' : 'var(--text-secondary)',
                  letterSpacing: '0.02em', textTransform: 'uppercase',
                  marginBottom: 16,
                }}>{tier.name}</div>

                <div style={{ marginBottom: 28, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontFamily: 'var(--font-space)',
                    fontSize: tier.price === 'Custom' ? 36 : 44,
                    fontWeight: 700, letterSpacing: '-0.03em',
                    color: 'var(--text-primary)', lineHeight: 1,
                  }}>{tier.price}</span>
                  {tier.period && (
                    <span style={{
                      fontFamily: 'var(--font-inter)', fontSize: 14,
                      color: 'var(--text-dim)', fontWeight: 300,
                    }}>{tier.period}</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32, flex: 1 }}>
                  {tier.features.map(f => (
                    <div key={f} style={{
                      fontFamily: 'var(--font-inter)', fontSize: 14,
                      color: 'var(--text-secondary)', fontWeight: 300,
                      display: 'flex', alignItems: 'baseline', gap: 10,
                    }}>
                      <span style={{
                        color: tier.highlight ? 'var(--btc-orange)' : 'var(--amber)',
                        fontSize: 14, flexShrink: 0,
                      }}>·</span>
                      {f}
                    </div>
                  ))}
                </div>

                {tier.highlight ? (
                  <a href="/dashboard" className="btn-orange" style={{
                    display: 'block', textAlign: 'center',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #F7931A, #ea580c)',
                    color: '#080c10',
                    fontFamily: 'var(--font-space)', fontSize: 14, fontWeight: 700,
                    textDecoration: 'none',
                    borderRadius: 999,
                    boxShadow: '0 4px 20px rgba(247,147,26,0.3)',
                    transition: 'box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                    cursor: 'pointer',
                  }}>{tier.cta}</a>
                ) : (
                  <a href="/dashboard" className="btn-outline" style={{
                    display: 'block', textAlign: 'center',
                    padding: '12px 20px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-space)', fontSize: 14, fontWeight: 600,
                    textDecoration: 'none',
                    borderRadius: 999,
                    border: '1px solid var(--border-hair)',
                    transition: 'border-color 0.2s ease, color 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                    cursor: 'pointer',
                  }}>{tier.cta}</a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────────────────────── */}
      <section style={{
        padding: '104px 0',
        borderTop: '1px solid var(--border-hair)',
        position: 'relative', overflow: 'hidden',
      }} ref={ctaRef}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800, height: 300,
          background: 'radial-gradient(ellipse, rgba(247,147,26,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ ...wrap, textAlign: 'center', position: 'relative' }}>
          <div className={`reveal${ctaVisible ? ' visible' : ''}`}>
            <div style={{
              fontFamily: 'var(--font-jet)', fontSize: 11,
              color: 'var(--btc-orange)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 24,
            }}>
              Ready to ship
            </div>
            <h2 style={{
              fontFamily: 'var(--font-space)',
              fontSize: 'clamp(32px, 4vw, 56px)',
              fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.0,
              margin: '0 0 16px', color: 'var(--text-primary)',
            }}>
              Give your agent spending authority.<br />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Keep control.</span>
            </h2>
            <p style={{
              fontFamily: 'var(--font-jet)', fontSize: 13,
              color: 'var(--text-dim)',
              margin: '0 0 40px', letterSpacing: '0.04em',
            }}>No custody. No code changes to your agent.</p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <a href="/dashboard" className="btn-orange" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 36px',
                background: 'linear-gradient(135deg, #F7931A, #ea580c)',
                color: '#080c10',
                fontFamily: 'var(--font-space)', fontSize: 16, fontWeight: 700,
                textDecoration: 'none',
                borderRadius: 999,
                boxShadow: '0 4px 32px rgba(247,147,26,0.3)',
                transition: 'box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                cursor: 'pointer',
              }}>Set up policies →</a>

              <div style={{
                fontFamily: 'var(--font-jet)', fontSize: 12,
                color: 'var(--text-dim)', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--green)', display: 'inline-block',
                  boxShadow: '0 0 6px rgba(16,185,129,0.5)',
                }} />
                Free during beta · No credit card
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border-hair)', padding: '36px 0' }}>
        <div style={{
          ...wrap,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }} className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-space)', fontSize: 18,
              fontWeight: 700, color: 'var(--text-dim)',
              letterSpacing: '-0.03em',
            }}>mandate</span>
            <span style={{
              fontFamily: 'var(--font-jet)', fontSize: 10,
              color: 'var(--text-dim)', letterSpacing: '0.08em',
            }}>· Built for the agentic web</span>
          </div>

          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Integrations', href: '/integrations' },
              { label: 'Docs', href: '#' },
              { label: 'GitHub', href: '#' },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="nav-link" style={{
                color: 'var(--text-dim)', textDecoration: 'none',
                fontSize: 13, fontFamily: 'var(--font-jet)',
                letterSpacing: '0.02em',
                transition: 'color 0.2s ease',
              }}>{label}</a>
            ))}
          </div>

          <div style={{
            fontFamily: 'var(--font-jet)', fontSize: 11,
            color: 'var(--text-dim)', letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
              background: 'rgba(247,147,26,0.5)',
            }} />
            EVM + Solana · Non-custodial
          </div>
        </div>
      </footer>
    </div>
  );
}
