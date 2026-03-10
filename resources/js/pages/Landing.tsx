import { useState, useEffect } from 'react';

/* ── Code block content ──────────────────────────────────────────────────── */
const CODE = `# 1. Register your agent
curl -X POST https://mandate.krutovoy.me/api/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"MyAgent","evmAddress":"0x...","chainId":84532}'
# → { "runtimeKey": "mndt_live_...", "agentId": "...", "claimUrl": "..." }

# 2. Validate before signing — key never leaves your machine
curl -X POST https://mandate.krutovoy.me/api/validate \\
  -H "Authorization: Bearer $RUNTIME_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"chainId":84532,"intentHash":"0x...","to":"0x...","calldata":"0x..."}'
# → { "allowed": true, "intentId": "b7b62e..." }

# 3. Sign locally with viem/ethers, then post the tx hash
curl -X POST https://mandate.krutovoy.me/api/intents/$INTENT_ID/events \\
  -H "Authorization: Bearer $RUNTIME_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"txHash":"0x..."}'
# → { "status": "broadcasted" }`;

/* ── Navbar ──────────────────────────────────────────────────────────────── */
function Navbar({ opaque }: { opaque: boolean }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: opaque ? 'rgba(8,12,16,0.97)' : 'rgba(8,12,16,0.7)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.3s ease',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 20, fontWeight: 400, color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>mandate</span>
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)',
            background: 'var(--amber-glow)', color: 'var(--amber)',
            border: '1px solid var(--amber-dim)',
            borderRadius: 3, padding: '2px 6px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>beta</span>
        </div>

        <div className="nav-center" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['How it works', 'Docs', 'Pricing'].map(link => (
            <a key={link} href="#" style={{
              color: 'var(--text-secondary)', textDecoration: 'none',
              fontSize: 14, fontFamily: 'var(--font-sans)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >{link}</a>
          ))}
        </div>

        <a href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px',
          background: 'var(--amber)', color: '#080c10',
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', borderRadius: 4,
          letterSpacing: '-0.01em',
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >Launch App →</a>
      </div>
    </nav>
  );
}

/* ── Single incident card state ──────────────────────────────────────────── */
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
      fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7,
      border: `1px solid ${accentDim}`, borderLeft: `3px solid ${accent}`,
      borderRadius: 8, background: '#060a0e', boxShadow: shadow,
    }}>
      {/* Header */}
      <div style={{
        background: accentBg, borderBottom: `1px solid ${accentDim}`,
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: accent, fontWeight: 500, letterSpacing: '0.02em' }}>
          {blocked ? '✓ BLOCKED' : '⚠ INCIDENT'} — 14:32:07
        </span>
        {blocked && (
          <span style={{
            fontSize: 10, color: 'var(--text-dim)',
            border: '1px solid var(--border-dim)', borderRadius: 3,
            padding: '1px 6px', letterSpacing: '0.06em',
          }}>mandate</span>
        )}
      </div>

      {/* Fields */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {([
          ['Agent',   'trading-bot-v2',                                          'secondary'],
          ['Action',  'transfer() → 0xdeadbeef\u2026c4f2',                       'secondary'],
          ['Amount',  '$4,200.00',                                               'primary'],
          [blocked ? 'Rule' : 'Trigger',
           blocked ? 'recipient not on allowlist' : 'prompt injection detected', 'accent'],
        ] as [string, string, string][]).map(([label, value, kind], i) => (
          <div key={i}>
            <span style={{ color: 'var(--text-dim)' }}>{label}:</span>{' '}
            <span style={{
              color: kind === 'primary'  ? 'var(--text-primary)'
                   : kind === 'accent'   ? accent
                   : 'var(--text-secondary)',
            }}>{value}</span>
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${accentDim}`, margin: '10px 0' }} />

        {/* Status pills */}
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

        {/* Result row */}
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

/* ── Incident card flipper (hero visual) ─────────────────────────────────── */
function IncidentCardFlipper() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIsBlocked(v => !v), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* State indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'flex-end' }}>
        {(['without', 'with mandate'] as const).map((label, i) => {
          const active = i === 0 ? !isBlocked : isBlocked;
          const c = i === 0 ? 'var(--red)' : 'var(--green)';
          const cDim = i === 0 ? 'var(--red-dim)' : 'var(--green-dim)';
          return (
            <span key={label} style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              background: active ? (i === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)') : 'transparent',
              border: `1px solid ${active ? cDim : 'var(--border-dim)'}`,
              color: active ? c : 'var(--text-dim)',
              transition: 'all 0.4s ease',
            }}>{label}</span>
          );
        })}
      </div>

      {/* CSS-grid stacked crossfade */}
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

/* ── Nightmare scenario card ─────────────────────────────────────────────── */
function NightmareCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: '1px solid var(--red-dim)', borderLeft: '3px solid var(--red)',
        borderRadius: 8, padding: '24px',
        background: hovered ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'background 0.2s ease', cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--red)',
        }}>{title}</span>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0 }}>{description}</p>
    </div>
  );
}

/* ── Job card (before/after) ─────────────────────────────────────────────── */
function JobCard({ icon, title, before, after }: { icon: string; title: string; before: string; after: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? 'var(--border)' : 'var(--border-dim)'}`,
        borderTop: '2px solid var(--amber)',
        borderRadius: 8, padding: '28px',
        background: hovered ? 'var(--bg-raised)' : 'var(--bg-surface)',
        display: 'flex', flexDirection: 'column', gap: 16,
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 18,
          fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)',
        }}>{title}</div>
      </div>

      <div style={{
        padding: '12px 14px', background: 'rgba(239,68,68,0.05)',
        border: '1px solid var(--red-dim)', borderRadius: 5,
      }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--red)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Before</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{before}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
        <span style={{ color: 'var(--amber)', fontSize: 14 }}>→</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
      </div>

      <div style={{
        padding: '12px 14px', background: 'rgba(16,185,129,0.05)',
        border: '1px solid var(--green-dim)', borderRadius: 5,
      }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>With Mandate</div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>{after}</div>
      </div>
    </div>
  );
}

/* ── Architecture diagram (SVG) ──────────────────────────────────────────── */
function ArchDiagram() {
  return (
    <div style={{ width: '100%', maxWidth: 740, margin: '0 auto', padding: '0 16px' }}>
      <svg viewBox="0 0 740 180" style={{ width: '100%', overflow: 'visible' }} aria-label="Agent to Mandate to Blockchain flow">
        {/* Node 1: Your Agent */}
        <rect x="10" y="58" width="185" height="76" rx="6" fill="#060a0e" stroke="#1c2a3a" strokeWidth="1" />
        <text x="102" y="88" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="13" fill="#f59e0b" fontWeight="500">🔑 Your Agent</text>
        <text x="102" y="107" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="10" fill="#7a8fa5">Private · Local signing</text>
        <text x="102" y="122" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="10" fill="#3d5166">Key never leaves here</text>

        {/* Connector 1: Agent → Mandate */}
        <line x1="195" y1="96" x2="278" y2="96" stroke="#1c2a3a" strokeWidth="1" strokeDasharray="4 3" />
        <text x="236" y="84" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="9" fill="#3d5166">validate</text>
        {/* Dot 1 */}
        <circle r="4" fill="#f59e0b">
          <animate attributeName="cx" from="197" to="276" dur="1.8s" repeatCount="indefinite" begin="0s" />
          <animate attributeName="opacity" keyTimes="0;0.08;0.82;1" values="0;1;1;0" dur="1.8s" repeatCount="indefinite" begin="0s" />
        </circle>

        {/* Node 2: Mandate */}
        <rect x="278" y="44" width="184" height="104" rx="6" fill="rgba(245,158,11,0.06)" stroke="#92610a" strokeWidth="1" />
        <text x="370" y="76" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="13" fill="#f59e0b" fontWeight="500">⚙ Mandate</text>
        <text x="370" y="95" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="10" fill="#7a8fa5">Policy enforcement</text>
        <text x="370" y="111" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="10" fill="#7a8fa5">Spend limits · Allowlists</text>
        <text x="370" y="127" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="10" fill="#3d5166">Circuit breakers · Approvals</text>

        {/* Connector 2: Mandate → Blockchain */}
        <line x1="462" y1="96" x2="545" y2="96" stroke="#1c2a3a" strokeWidth="1" strokeDasharray="4 3" />
        <text x="503" y="84" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="9" fill="#3d5166">broadcast</text>
        {/* Dot 2 */}
        <circle r="4" fill="#10b981">
          <animate attributeName="cx" from="464" to="543" dur="1.8s" repeatCount="indefinite" begin="0.9s" />
          <animate attributeName="opacity" keyTimes="0;0.08;0.82;1" values="0;1;1;0" dur="1.8s" repeatCount="indefinite" begin="0.9s" />
        </circle>

        {/* Node 3: Blockchain */}
        <rect x="545" y="58" width="185" height="76" rx="6" fill="#060a0e" stroke="#1c2a3a" strokeWidth="1" />
        <text x="637" y="88" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="13" fill="#10b981" fontWeight="500">⛓ Blockchain</text>
        <text x="637" y="107" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="10" fill="#7a8fa5">On-chain execution</text>
        <text x="637" y="122" textAnchor="middle" fontFamily="'Geist Mono',monospace" fontSize="10" fill="#3d5166">Immutable record</text>
      </svg>

      <p style={{
        textAlign: 'center', marginTop: 20,
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--text-dim)', letterSpacing: '0.04em',
      }}>
        Your private key never touches our servers. You sign locally.
      </p>
    </div>
  );
}

/* ── Chain pill ──────────────────────────────────────────────────────────── */
function ChainPill({ name, color }: { name: string; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 20,
        border: `1px solid ${hovered ? color + '55' : 'var(--border-dim)'}`,
        background: hovered ? color + '14' : 'transparent',
        transition: 'all 0.2s ease', cursor: 'default',
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: hovered ? color : 'var(--text-dim)',
        transition: 'background 0.2s ease',
        display: 'inline-block',
      }} />
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: hovered ? 'var(--text-primary)' : 'var(--text-dim)',
        transition: 'color 0.2s ease', letterSpacing: '0.02em',
      }}>{name}</span>
    </div>
  );
}

const EVM_CHAINS = [
  { name: 'Ethereum', color: '#627EEA' },
  { name: 'Base',     color: '#0052FF' },
  { name: 'Polygon',  color: '#8247E5' },
  { name: 'Arbitrum', color: '#28A0F0' },
  { name: 'Optimism', color: '#FF0420' },
];

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function Landing() {
  const [navOpaque, setNavOpaque] = useState(false);

  useEffect(() => {
    const handleScroll = () => setNavOpaque(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const section: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .hero-grid    { flex-direction: column !important; }
          .hero-visual  { width: 100% !important; margin-top: 48px; }
          .nav-center   { display: none !important; }
          .nightmare-grid { grid-template-columns: 1fr !important; }
          .jobs-grid    { grid-template-columns: 1fr !important; }
          .chains-row   { flex-wrap: wrap !important; justify-content: center !important; }
        }
      `}</style>

      <Navbar opaque={navOpaque} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', paddingTop: 60,
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '15%', left: '-5%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(239,68,68,0.03) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ ...section, width: '100%', paddingTop: 80, paddingBottom: 80 }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 64 }}>

            {/* Left: copy */}
            <div style={{ flex: '0 0 50%', maxWidth: 560 }}>
              <div className="fade-up fade-up-1" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px',
                background: 'var(--red-glow)', border: '1px solid var(--red-dim)',
                borderRadius: 20, marginBottom: 28,
              }}>
                <span className="pulse-red" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--red)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Agent Security Infrastructure
                </span>
              </div>

              <h1 className="fade-up fade-up-2" style={{
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: 'clamp(44px, 5vw, 72px)',
                fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.03em',
                color: 'var(--text-primary)', margin: '0 0 24px',
              }}>
                Your agent can be<br />
                tricked into spending.<br />
                <span style={{ color: 'var(--amber)' }}>Stop it.</span>
              </h1>

              <p className="fade-up fade-up-3" style={{
                fontSize: 18, lineHeight: 1.65,
                color: 'var(--text-secondary)',
                margin: '0 0 28px', maxWidth: 480,
              }}>
                The control plane that makes agent-initiated spend safe, governable, and auditable. Not another wallet.
              </p>

              <div className="fade-up fade-up-3" style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--text-dim)', letterSpacing: '0.02em',
                marginBottom: 32, lineHeight: 1.7,
                borderLeft: '2px solid var(--amber-dim)', paddingLeft: 14,
              }}>
                Agents propose. Policy decides.<br />
                Infrastructure enforces. Humans intervene only on exceptions.
              </div>

              <div className="fade-up fade-up-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <a href="/dashboard" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 24px',
                  background: 'var(--amber)', color: '#080c10',
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none', borderRadius: 5,
                  letterSpacing: '-0.01em', transition: 'opacity 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >Set up policies →</a>

                <a href="#how-it-works" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 24px',
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono)', fontSize: 14,
                  textDecoration: 'none', borderRadius: 5,
                  transition: 'color 0.15s, border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-dim)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >See how it works</a>
              </div>
            </div>

            {/* Right: incident card flipper */}
            <div className="hero-visual fade-up" style={{ flex: 1, minWidth: 0, animationDelay: '0.3s' }}>
              <IncidentCardFlipper />
            </div>

          </div>
        </div>
      </section>

      {/* ── What can go wrong ─────────────────────────────────────────────── */}
      <section style={{
        background: 'rgba(239,68,68,0.02)',
        borderTop: '1px solid var(--red-dim)', borderBottom: '1px solid var(--red-dim)',
        padding: '80px 0',
      }}>
        <div style={section}>
          <div style={{ marginBottom: 48, maxWidth: 560 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--red)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              What can go wrong
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0,
            }}>
              Without policy enforcement,<br />
              <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                your agent is one prompt away from a disaster.
              </span>
            </h2>
          </div>

          <div className="nightmare-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <NightmareCard
              icon="🎣"
              title="Prompt Injection"
              description="A poisoned tool output tells your agent it must transfer funds immediately. No policy check. $10k wired to an attacker address. Transaction confirmed. Funds gone."
            />
            <NightmareCard
              icon="🔄"
              title="Runaway Loop"
              description="A retry logic bug sends your agent into an infinite loop. 847 API calls in 60 seconds. $2,400 in fees. No circuit breaker to stop it. You find out from your billing dashboard."
            />
            <NightmareCard
              icon="🎯"
              title="Wrong Destination"
              description="A parser failure corrupts the destination address. Your agent sends funds to an address it doesn't own. No allowlist enforced. No recovery. The blockchain doesn't undo mistakes."
            />
          </div>
        </div>
      </section>

      {/* ── With Mandate: Jobs to be Done ────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 0' }}>
        <div style={section}>
          <div style={{ marginBottom: 56, maxWidth: 560 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              With Mandate
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0,
            }}>
              Every risk above,<br />
              <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>handled by policy.</span>
            </h2>
          </div>

          <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <JobCard
              icon="🛡"
              title="Spend Controls"
              before="Agent can spend unlimited amounts, on any destination, at any time. One confused decision = unrecoverable loss."
              after="$200/day cap · LLM APIs only · new destinations blocked by default. Policy enforced before the key is ever touched."
            />
            <JobCard
              icon="⚡"
              title="Emergency Stop"
              before="No way to pause agent mid-operation. Have to kill the whole process, restart from scratch, lose your place."
              after="Circuit breaker trips on anomaly. One API call freezes all activity instantly. Resume with full audit trail when you're ready."
            />
            <JobCard
              icon="👤"
              title="Human Approval on Big Moves"
              before="Agent executes a $5k transaction while you sleep. No oversight possible. You find out the next morning."
              after="Transactions above $50 route to an approval queue. Slack notification arrives instantly. You approve or reject. You decide."
            />
            <JobCard
              icon="📋"
              title="Audit Trail"
              before="Agent did something unexpected. No logs, no context, no way to know what triggered it or why it happened."
              after="Every intent logged: who authorized, what policy applied, what was sent, what happened on-chain. Fully queryable."
            />
          </div>
        </div>
      </section>

      {/* ── Chains strip ─────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--border-dim)', borderBottom: '1px solid var(--border-dim)',
        padding: '48px 0', background: 'var(--bg-surface)',
      }}>
        <div style={{ ...section, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Chain-agnostic policy enforcement
          </div>
          <p style={{
            fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px',
            fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em',
          }}>
            Mandate sits at the intent layer — above the chain. Write one policy, enforce it anywhere.
          </p>
          <div className="chains-row" style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            {EVM_CHAINS.map(c => <ChainPill key={c.name} {...c} />)}
            <span style={{ color: 'var(--border)', padding: '0 4px', fontSize: 18, lineHeight: 1 }}>·</span>
            <ChainPill name="Solana" color="#9945FF" />
            <span style={{ color: 'var(--border)', padding: '0 4px', fontSize: 18, lineHeight: 1 }}>·</span>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-dim)',
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.02em',
            }}>+ More coming</div>
          </div>
        </div>
      </div>

      {/* ── Architecture ──────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 0' }}>
        <div style={section}>
          <div style={{ marginBottom: 56, maxWidth: 560 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              Architecture
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0,
            }}>
              Non-custodial by design.<br />
              <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Your key never leaves.</span>
            </h2>
          </div>
          <ArchDiagram />
        </div>
      </section>

      {/* ── Code block ───────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 0 100px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-dim)',
      }}>
        <div style={section}>
          <div style={{ display: 'flex', gap: 80, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 280px' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                Any environment
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 2.5vw, 40px)',
                fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px',
              }}>
                Integrate in<br />
                <span style={{ fontStyle: 'italic' }}>15 minutes.</span>
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0 }}>
                Pure HTTP — no SDK required. Works from any language, any agent framework.
              </p>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: '#040709', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>mandate-integration.sh</span>
                </div>
                <pre style={{
                  margin: 0, padding: '24px 24px',
                  fontFamily: 'var(--font-mono)', fontSize: 12.5,
                  lineHeight: 1.75, color: 'var(--text-secondary)',
                  overflowX: 'auto', whiteSpace: 'pre',
                }}>
                  {CODE.split('\n').map((line, i) => {
                    const isComment  = line.trim().startsWith('#');
                    const isCurl     = line.trim().startsWith('curl') || line.trim().startsWith('-');
                    const isResponse = line.trim().startsWith('# →');
                    return (
                      <span key={i} style={{
                        display: 'block',
                        color: isResponse ? 'var(--green)'
                             : isComment  ? 'var(--text-dim)'
                             : isCurl     ? 'var(--text-primary)'
                             : 'var(--amber)',
                      }}>{line}</span>
                    );
                  })}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        padding: '80px 0', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 200,
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ ...section, textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
            Get started
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 3.5vw, 52px)',
            fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px',
          }}>
            Give your agent spending authority.<br />
            <span style={{ fontStyle: 'italic' }}>Keep control.</span>
          </h2>
          <p style={{
            fontSize: 16, color: 'var(--text-secondary)',
            margin: '0 0 36px', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em',
          }}>No custody. No code changes to your agent.</p>
          <a href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px',
            background: 'var(--amber)', color: '#080c10',
            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600,
            textDecoration: 'none', borderRadius: 5,
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >Set up policies →</a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border-dim)', padding: '32px 0' }}>
        <div style={{
          ...section,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 18, fontWeight: 400, color: 'var(--text-dim)', letterSpacing: '-0.02em',
          }}>mandate</span>

          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Docs', href: '#' },
              { label: 'GitHub', href: '#' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{
                color: 'var(--text-dim)', textDecoration: 'none',
                fontSize: 13, fontFamily: 'var(--font-mono)', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >{label}</a>
            ))}
          </div>

          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
            Built for the agentic web
          </span>
        </div>
      </footer>
    </div>
  );
}
