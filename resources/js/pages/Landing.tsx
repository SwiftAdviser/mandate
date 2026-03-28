import { useState, useEffect, useRef, useCallback } from 'react';

/* ── Nav links ───────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'How it works', href: '#capabilities' },
  { label: 'Contact', href: '#contact' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Docs', href: 'https://github.com/SwiftAdviser/mandate/tree/master/packages/sdk#readme' },
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
    title: 'Approval Gates',
    description: 'Transactions above threshold wait for your sign-off. Slack, webhook, or email.',
    tags: ['Any threshold', 'Slack · webhook'],
    featured: false,
  },
];

/* ── Build items ─────────────────────────────────────────────────────────── */
const BUILD_ITEMS = [
  {
    num: '01',
    title: 'DeFi on autopilot',
    description: 'Monitor yields, execute trades on Base, rebalance liquidity 24/7. Agent spots a better opportunity at 3am — it acts immediately, because you already set the rules.',
  },
  {
    num: '02',
    title: 'The Machine Economy',
    description: 'Agents that pay for their own compute, data, and storage via the x402 protocol. Acquire API keys, buy data feeds, pay for storage — no human needed per transaction.',
  },
  {
    num: '03',
    title: 'Agent-to-Human Payments',
    description: 'Sell on creator platforms. Send payments between agents and users. Monetize agent output — without approving every transaction by hand.',
  },
  {
    num: '04',
    title: 'Multi-Chain Operations',
    description: 'Deploy on Base, manage positions wherever the opportunity is. One policy set, enforced across every chain your agent touches.',
  },
];

/* ── Pricing ─────────────────────────────────────────────────────────────── */

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

/* ── Works-with logos (real SVG files in /public/logos/) ─────────────────── */
const WORKS_WITH = [
  { name: 'Claude Code', file: 'claude.svg' },
  { name: 'OpenClaw',    file: 'openclaw.svg' },
  { name: 'Cursor',      file: 'cursor.svg' },
  { name: 'Codex',       file: 'codex.svg' },
  { name: 'AgentKit',    file: 'coinbase.svg' },
  { name: 'Bash',        file: 'bash.svg' },
  { name: 'HTTP',        file: 'http.svg' },
];


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
          <img src="/logo.png" alt="Mandate" style={{ width: 28, height: 28 }} />
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

/* ── Copyable install box ────────────────────────────────────────────────── */
function CopyInstall() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText('bun add @mandate/sdk').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, []);

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      background: '#0d1117', border: '1px solid rgba(247,147,26,0.18)',
      borderRadius: 8, padding: '12px 16px',
      fontFamily: 'var(--font-jet)', fontSize: 14,
      color: 'var(--btc-orange)',
      maxWidth: '100%',
    }}>
      <span style={{ letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ color: 'var(--text-dim)', userSelect: 'none' }}>$ </span>bun add @mandate/sdk
      </span>
      <button
        onClick={copy}
        style={{
          background: 'transparent', border: '1px solid rgba(247,147,26,0.25)',
          borderRadius: 4, padding: '4px 10px',
          fontFamily: 'var(--font-jet)', fontSize: 11,
          color: copied ? 'var(--green)' : 'var(--text-dim)',
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'color 0.2s ease, border-color 0.2s ease',
          letterSpacing: '0.04em',
        }}
      >{copied ? 'Copied!' : 'Copy'}</button>
    </div>
  );
}

/* ── Code snippet ───────────────────────────────────────────────────────── */
const SDK_SNIPPET = `import { MandateWallet, MandateClient } from '@mandate/sdk';

const { runtimeKey } = await MandateClient.register({
  name: 'MyAgent', walletAddress: wallet.address, chainId: 84532
});

const mandate = new MandateWallet({ runtimeKey, signer: wallet, chainId: 84532 });
await mandate.transfer(recipient, '5000000', USDC);`;

/* ── Main landing page ───────────────────────────────────────────────────── */
export default function LandingV3() {
  const [navOpaque, setNavOpaque] = useState(false);
  const { ref: capsRef, visible: capsVisible } = useReveal();
  const { ref: buildRef, visible: buildVisible } = useReveal();
  const { ref: contactRef, visible: contactVisible } = useReveal();
  const { ref: devRef, visible: devVisible } = useReveal();
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
          .dev-code-box   { font-size: 11px !important; padding: 16px 14px !important; }
        }

        /* Pulse dot */
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }

        /* Works-with hover */
        .works-item:hover { opacity: 0.85 !important; }
      `}</style>

      <Navbar opaque={navOpaque} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        height: '100svh', paddingTop: 60,
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* One subtle warmth in the far background */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 500,
          background: 'radial-gradient(ellipse, rgba(247,147,26,0.025) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ ...wrap, width: '100%', paddingTop: 40, paddingBottom: 32, flex: 1, display: 'flex', alignItems: 'center' }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 56, width: '100%' }}>

            {/* Left — copy */}
            <div style={{ flex: '0 0 50%', maxWidth: 540 }}>
              <h1 style={{
                fontFamily: 'var(--font-space)',
                fontSize: 'clamp(36px, 4vw, 54px)',
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                margin: '0 0 20px',
              }}>
                Give your agent<br />
                <span style={{ color: 'var(--btc-orange)' }}>money.</span>{' '}
                Sleep fine.
              </h1>

              <p style={{
                fontFamily: 'var(--font-inter)', fontSize: 16, lineHeight: 1.6,
                color: 'var(--text-secondary)',
                fontWeight: 300,
                margin: '0 0 32px', maxWidth: 400,
              }}>
                Spend policy enforced before the key is touched.
                Not a wallet — a control plane.
              </p>

              <a href="/dashboard" className="btn-orange" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #F7931A, #ea580c)',
                color: '#080c10',
                fontFamily: 'var(--font-space)', fontSize: 14, fontWeight: 700,
                textDecoration: 'none',
                borderRadius: 999,
                boxShadow: '0 4px 20px rgba(247,147,26,0.2)',
                transition: 'box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                cursor: 'pointer',
              }}>Set up policies →</a>
            </div>

            {/* Right — incident card */}
            <div className="hero-right" style={{ flex: 1, minWidth: 0 }}>
              <IncidentCardFlipper />
            </div>

          </div>
        </div>

        {/* ── Works with — minimal row, always visible at bottom of hero ── */}
        <div style={{
          borderTop: '1px solid rgba(30,41,59,0.35)',
          flexShrink: 0,
          padding: '0 24px',
        }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto',
            display: 'flex', alignItems: 'center', gap: 0,
            overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          }}>
            <span style={{
              fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 500,
              color: 'var(--text-dim)', letterSpacing: '0.04em',
              whiteSpace: 'nowrap', paddingRight: 20, flexShrink: 0,
              textTransform: 'uppercase',
            }}>Works with</span>

            {WORKS_WITH.map(({ name, file }) => (
              <div key={name} className="works-item" style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '14px 16px',
                flexShrink: 0, cursor: 'default',
                opacity: 0.5,
                transition: 'opacity 0.2s ease',
              }}>
                <img
                    src={`/logos/${file}`}
                    alt={name}
                    style={{ width: 18, height: 18, objectFit: 'contain', display: 'block' }}
                  />
                <span style={{
                  fontFamily: 'var(--font-inter)', fontSize: 12,
                  color: 'var(--text-dim)', whiteSpace: 'nowrap',
                }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                      color: 'var(--accent)',
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
              What wasn't possible before<br />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>wallets had policy.</span>
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

      {/* ── Supported Chains ──────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 0',
        borderTop: '1px solid var(--border-hair)',
      }}>
        <div style={{ ...wrap }}>
          <div style={{
            fontFamily: 'var(--font-jet)', fontSize: 11,
            color: 'var(--btc-orange)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 20,
          }}>
            Multi-Chain
          </div>
          <h2 style={{
            fontFamily: 'var(--font-space)',
            fontSize: 'clamp(24px, 2.5vw, 36px)',
            fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
            margin: '0 0 40px', color: 'var(--text-primary)',
          }}>
            One policy layer. Every chain.
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 16,
          }}>
            {[
              { name: 'Ethereum', type: 'evm', color: '#627EEA' },
              { name: 'Base', type: 'evm', color: '#0052FF' },
              { name: 'Solana', type: 'solana', color: '#9945FF' },
              { name: 'TON', type: 'ton', color: '#0098EA' },
            ].map((chain) => (
              <div key={chain.name} style={{
                padding: '24px 20px',
                borderRadius: 8,
                border: '1px solid var(--border-dim)',
                background: 'rgba(15,17,21,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `${chain.color}20`,
                  border: `1px solid ${chain.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: chain.color,
                  fontFamily: 'var(--font-space)',
                }}>
                  {chain.name[0]}
                </div>
                <div style={{
                  fontFamily: 'var(--font-space)', fontSize: 14,
                  fontWeight: 600, color: 'var(--text-primary)',
                }}>
                  {chain.name}
                </div>
                <div style={{
                  fontFamily: 'var(--font-jet)', fontSize: 10,
                  color: 'var(--text-dim)', textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {chain.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" style={{
        padding: '104px 0',
        borderTop: '1px solid var(--border-hair)',
      }}>
        <div style={{ ...wrap, maxWidth: 600 }} ref={contactRef}>
          <div className={`reveal${contactVisible ? ' visible' : ''}`}>
            <div style={{
              fontFamily: 'var(--font-jet)', fontSize: 11,
              color: 'var(--btc-orange)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              Early Access
            </div>
            <h2 style={{
              fontFamily: 'var(--font-space)',
              fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
              margin: '0 0 16px', color: 'var(--text-primary)',
            }}>
              Building agents<br />that handle money?
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter)', fontSize: 16, lineHeight: 1.65,
              color: 'var(--text-secondary)', fontWeight: 300,
              margin: '0 0 36px', maxWidth: 420,
            }}>
              We're working with teams early. Tell us what you're building and we'll set you up.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <a
                href="https://t.me/+DkZc6INLxGJkYzlk"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-orange"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #F7931A, #ea580c)',
                  color: '#080c10',
                  fontFamily: 'var(--font-space)', fontSize: 15, fontWeight: 700,
                  textDecoration: 'none',
                  borderRadius: 999,
                  boxShadow: '0 4px 24px rgba(247,147,26,0.2)',
                  transition: 'box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.93l-2.95-.924c-.64-.203-.658-.64.136-.954l11.566-4.46c.537-.194 1.006.131.842.629z"/>
                </svg>
                Join Telegram
              </a>
              <a
                href="mailto:hello@mandate.md"
                className="btn-outline"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 24px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-space)', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none',
                  borderRadius: 999,
                  border: '1px solid var(--border-hair)',
                  transition: 'border-color 0.2s ease, color 0.2s ease',
                  cursor: 'pointer',
                }}
              >Email us</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Developers & AI Agents ────────────────────────────────────── */}
      <section style={{
        padding: '104px 0',
        borderTop: '1px solid var(--border-hair)',
        background: 'var(--void)',
      }} ref={devRef}>
        <div style={wrap}>
          <div className={`reveal${devVisible ? ' visible' : ''}`}>
            <div style={{
              fontFamily: 'var(--font-jet)', fontSize: 11,
              color: 'var(--btc-orange)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              Integrate
            </div>
            <h2 style={{
              fontFamily: 'var(--font-space)',
              fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
              margin: '0 0 40px', color: 'var(--text-primary)',
            }}>
              For Developers &amp; AI Agents
            </h2>
          </div>

          <div className={`reveal d1${devVisible ? ' visible' : ''}`} style={{ marginBottom: 32 }}>
            <CopyInstall />
          </div>

          <div className={`dev-code-box reveal d2${devVisible ? ' visible' : ''}`} style={{
            background: '#0d1117',
            border: '1px solid rgba(30,41,59,0.5)',
            borderRadius: 10,
            padding: '24px 28px',
            marginBottom: 32,
            overflowX: 'auto',
          }}>
            <pre style={{
              fontFamily: 'var(--font-jet)', fontSize: 13,
              lineHeight: 1.7, color: 'var(--text-secondary)',
              margin: 0, whiteSpace: 'pre',
            }}>{SDK_SNIPPET}</pre>
          </div>

          <div className={`reveal d3${devVisible ? ' visible' : ''}`} style={{
            fontFamily: 'var(--font-inter)', fontSize: 15,
            color: 'var(--text-secondary)', fontWeight: 300,
            lineHeight: 1.7, marginBottom: 32,
          }}>
            For AI agents: give your agent this{' '}
            <a
              href="https://app.mandate.md/SKILL.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--btc-orange)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >SKILL.md</a>
          </div>

          <div className={`reveal d4${devVisible ? ' visible' : ''}`} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a
              href="https://github.com/SwiftAdviser/mandate/tree/master/packages/sdk#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-space)', fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
                borderRadius: 999,
                border: '1px solid var(--border-hair)',
                transition: 'border-color 0.2s ease, color 0.2s ease',
                cursor: 'pointer',
              }}
            >SDK Docs</a>
            <a
              href="https://github.com/SwiftAdviser/mandate"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-space)', fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
                borderRadius: 999,
                border: '1px solid var(--border-hair)',
                transition: 'border-color 0.2s ease, color 0.2s ease',
                cursor: 'pointer',
              }}
            >GitHub</a>
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
            }}>· For agents that handle money</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Integrations', href: '/integrations' },
              { label: 'Docs', href: 'https://github.com/SwiftAdviser/mandate/tree/master/packages/sdk#readme' },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="nav-link" style={{
                color: 'var(--text-dim)', textDecoration: 'none',
                fontSize: 13, fontFamily: 'var(--font-jet)',
                letterSpacing: '0.02em',
                transition: 'color 0.2s ease',
              }}>{label}</a>
            ))}
            <a
              href="https://github.com/SwiftAdviser/mandate"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-dim)', textDecoration: 'none', display: 'flex', alignItems: 'center', transition: 'color 0.2s ease' }}
              className="nav-link"
              title="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a
              href="https://t.me/+DkZc6INLxGJkYzlk"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-dim)', textDecoration: 'none',
                display: 'flex', alignItems: 'center',
                transition: 'color 0.2s ease',
              }}
              className="nav-link"
              title="Telegram"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
            </a>
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
