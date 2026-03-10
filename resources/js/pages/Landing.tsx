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

const NAV_LINKS = [
  { label: 'How it works', href: '#capabilities' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Docs', href: '#' },
];

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
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} style={{
              color: 'var(--text-secondary)', textDecoration: 'none',
              fontSize: 14, fontFamily: 'var(--font-sans)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >{label}</a>
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

/* ── Incident card flipper (hero visual) ─────────────────────────────────── */
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
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              background: active ? (i === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)') : 'transparent',
              border: `1px solid ${active ? cDim : 'var(--border-dim)'}`,
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

/* ── Capabilities item ───────────────────────────────────────────────────── */
interface CapabilityItem {
  num: string;
  title: string;
  description: string;
  tags: string[];
}

const CAPABILITIES: CapabilityItem[] = [
  {
    num: '01',
    title: 'Spend Controls',
    description: 'Set a daily budget. Cap destinations. Per-tx limits. No changes to your agent code.',
    tags: ['$200/day', 'allowlists'],
  },
  {
    num: '02',
    title: 'Circuit Breaker',
    description: 'One API call freezes all activity. Auto-trips on anomaly at 3am. Full audit trail.',
    tags: ['< 50ms', 'auto-trips'],
  },
  {
    num: '03',
    title: 'Human-in-the-Loop',
    description: 'Transactions above your threshold wait for human approval. Slack, webhook, or email.',
    tags: ['Any threshold', 'Slack · webhook'],
  },
];

/* ── Pricing tier ────────────────────────────────────────────────────────── */
interface PricingTier {
  name: string;
  price: string;
  features: string[];
  cta: string;
  ctaStyle: 'filled' | 'outline';
  badge?: string;
  highlight?: boolean;
}

const PRICING: PricingTier[] = [
  {
    name: 'Free (Beta)',
    price: '$0 / month',
    features: ['1 agent', '500 tx/month', 'Community support', 'All EVM chains + Solana'],
    cta: 'Start building →',
    ctaStyle: 'outline',
  },
  {
    name: 'Pro',
    price: '$99 / month',
    features: ['10 agents', '50k tx/month', 'Slack alerts', 'Priority support', 'Custom policies'],
    cta: 'Get started →',
    ctaStyle: 'filled',
    badge: 'Most popular',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited agents', 'SLA', 'Dedicated support', 'On-prem option'],
    cta: 'Talk to us →',
    ctaStyle: 'outline',
  },
];

/* ── What You Can Build items ────────────────────────────────────────────── */
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
          .hero-grid      { flex-direction: column !important; }
          .hero-visual    { width: 100% !important; margin-top: 48px; }
          .nav-center     { display: none !important; }
          .caps-grid      { grid-template-columns: 1fr !important; }
          .build-grid     { grid-template-columns: 1fr !important; }
          .pricing-grid   { grid-template-columns: 1fr !important; }
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
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--amber)', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 24,
              }}>
                Policy engine for autonomous agents
              </div>

              <h1 className="fade-up fade-up-2" style={{
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: 'clamp(40px, 4.3vw, 56px)',
                fontWeight: 300, lineHeight: 1.08, letterSpacing: '-0.03em',
                color: 'var(--text-primary)', margin: '0 0 24px',
              }}>
                Give your agent<br />
                money. Sleep fine.
              </h1>

              <p className="fade-up fade-up-3" style={{
                fontSize: 17, lineHeight: 1.65,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                margin: '0 0 32px', maxWidth: 480,
              }}>
                Mandate enforces spend policy before the key is touched. Not a wallet — a control plane.
              </p>

              <div className="fade-up fade-up-4" style={{ marginBottom: 28 }}>
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
              </div>

              <div className="fade-up fade-up-5" style={{
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-dim)', letterSpacing: '0.04em',
              }}>
                Non-custodial · EVM + Solana · 15 min setup
              </div>
            </div>

            {/* Right: incident card flipper */}
            <div className="hero-visual fade-up" style={{ flex: 1, minWidth: 0, animationDelay: '0.3s' }}>
              <IncidentCardFlipper />
            </div>

          </div>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <section id="capabilities" style={{ padding: '96px 0' }}>
        <div style={section}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--amber)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 32,
          }}>
            What Mandate Does
          </div>

          <div className="caps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 64 }}>
            {CAPABILITIES.map(({ num, title, description, tags }) => (
              <div key={num}>
                <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 28 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--amber)', letterSpacing: '0.1em',
                    marginBottom: 12,
                  }}>{num}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 26,
                    fontWeight: 400, letterSpacing: '-0.02em',
                    color: 'var(--text-primary)', margin: '0 0 16px',
                  }}>{title}</h3>
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontSize: 15,
                    color: 'var(--text-secondary)', lineHeight: 1.65,
                    margin: '0 0 20px', maxWidth: 280,
                  }}>{description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {tags.map(tag => (
                      <span key={tag} style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12,
                        color: 'var(--amber)', opacity: 0.7,
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Can Build ───────────────────────────────────────────── */}
      <section style={{
        padding: '96px 0',
        borderTop: '1px solid var(--border-dim)',
        background: 'var(--bg-surface)',
      }}>
        <div style={section}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--amber)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>
            What You Can Build
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 'clamp(26px, 2.8vw, 40px)',
            fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
            margin: '0 0 56px', color: 'var(--text-primary)',
          }}>
            Once agents can hold money,<br />entirely new categories emerge.
          </h2>

          <div className="build-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 80px',
          }}>
            {BUILD_ITEMS.map(({ num, title, description }) => (
              <div key={num} style={{
                borderTop: '1px solid var(--border-dim)',
                paddingTop: 28,
                paddingBottom: 48,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--amber)', letterSpacing: '0.1em',
                  marginBottom: 12,
                }}>{num}</div>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: 22,
                  fontWeight: 400, letterSpacing: '-0.02em',
                  color: 'var(--text-primary)', margin: '0 0 14px',
                }}>{title}</h3>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: 15,
                  color: 'var(--text-secondary)', lineHeight: 1.7,
                  margin: 0,
                }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" style={{
        padding: '96px 0',
        borderTop: '1px solid var(--border-dim)',
      }}>
        <div style={section}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--amber)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>
            Pricing
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 'clamp(28px, 3vw, 40px)',
            fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
            margin: '0 0 56px',
          }}>
            Start free. Scale when you need to.
          </h2>

          <div className="pricing-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20, maxWidth: 900, margin: '0 auto',
          }}>
            {PRICING.map(tier => (
              <div key={tier.name} style={{
                background: 'var(--bg-surface)',
                border: `1px solid ${tier.highlight ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 4,
                padding: '32px 28px',
                boxShadow: tier.highlight ? '0 0 0 1px var(--amber), 0 0 32px rgba(245,158,11,0.08)' : 'none',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
              }}>
                {tier.badge && (
                  <div style={{
                    position: 'absolute', top: -1, right: 20,
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--amber)', letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)',
                    borderTop: 'none', borderRadius: '0 0 4px 4px',
                    padding: '3px 10px',
                  }}>{tier.badge}</div>
                )}

                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14,
                  color: 'var(--text-secondary)', marginBottom: 12,
                }}>{tier.name}</div>

                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 36,
                  fontWeight: 400, letterSpacing: '-0.02em',
                  color: 'var(--text-primary)', marginBottom: 28,
                  lineHeight: 1,
                }}>{tier.price}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {tier.features.map(f => (
                    <div key={f} style={{
                      fontFamily: 'var(--font-sans)', fontSize: 14,
                      color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'baseline', gap: 8,
                    }}>
                      <span style={{ color: 'var(--amber)', fontSize: 12, flexShrink: 0 }}>·</span>
                      {f}
                    </div>
                  ))}
                </div>

                <a href="/dashboard" style={{
                  display: 'block', textAlign: 'center',
                  padding: '10px 20px', borderRadius: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', marginTop: 'auto',
                  background: tier.ctaStyle === 'filled' ? 'var(--amber)' : 'transparent',
                  color: tier.ctaStyle === 'filled' ? '#080c10' : 'var(--text-secondary)',
                  border: `1px solid ${tier.ctaStyle === 'filled' ? 'var(--amber)' : 'var(--border)'}`,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >{tier.cta}</a>
              </div>
            ))}
          </div>
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
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--amber)', letterSpacing: '0.12em',
                textTransform: 'uppercase', marginBottom: 16,
              }}>
                Any environment
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 2.5vw, 40px)',
                fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px',
              }}>
                Integrate in 15 minutes from any language.{' '}
                <span style={{ fontStyle: 'italic' }}>Pure HTTP.</span>
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                No SDK required. Works from any language, any agent framework.
              </p>
              <a href="/integrations" style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--text-dim)', textDecoration: 'none',
                letterSpacing: '0.02em',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >Pick your framework →</a>
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
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 3.5vw, 48px)',
            fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px',
          }}>
            Give your agent spending authority.<br />
            <span style={{ fontStyle: 'italic' }}>Keep control.</span>
          </h2>
          <p style={{
            fontSize: 14, color: 'var(--text-dim)',
            margin: '0 0 36px', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
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
              { label: 'Integrations', href: '/integrations' },
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
