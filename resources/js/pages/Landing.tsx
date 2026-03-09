import { useState, useEffect, useRef } from 'react';

/* ── Terminal animation data ─────────────────────────────────────────────── */
const TERMINAL_LINES = [
  { text: '$ POST /api/agents/register', type: 'cmd', delay: 0 },
  { text: '  → { runtimeKey: "mndt_live_3BMG...",', type: 'out', delay: 60 },
  { text: '      agentId: "019cd4f2..." }', type: 'out', delay: 30 },
  { text: '', type: 'gap', delay: 20 },
  { text: '$ POST /api/validate', type: 'cmd', delay: 0 },
  { text: '  { chainId: 84532, intentHash: "0x7f2a..." }', type: 'arg', delay: 40 },
  { text: '  → { allowed: true, intentId: "b7b62..." }', type: 'out', delay: 60 },
  { text: '', type: 'gap', delay: 20 },
  { text: '$ [signing with viem — key never sent]', type: 'dim', delay: 0 },
  { text: '', type: 'gap', delay: 20 },
  { text: '$ POST /api/intents/b7b62.../events', type: 'cmd', delay: 0 },
  { text: '  { txHash: "0xff1c4a..." }', type: 'arg', delay: 40 },
  { text: '  → { status: "broadcasted" }', type: 'out', delay: 60 },
  { text: '', type: 'gap', delay: 30 },
  { text: '✓ confirmed on-chain. block 14823901', type: 'success', delay: 0 },
];

const CHAR_DELAY = 18; // ms per character

function useTerminalAnimation() {
  const [visibleLines, setVisibleLines] = useState<{ text: string; type: string }[]>([]);
  const [currentChar, setCurrentChar] = useState(0);
  const [currentLine, setCurrentLine] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'pause' | 'reset'>('typing');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === 'reset') {
      setVisibleLines([]);
      setCurrentLine(0);
      setCurrentChar(0);
      setPhase('typing');
      return;
    }
    if (phase === 'pause') {
      timeoutRef.current = setTimeout(() => setPhase('reset'), 3000);
      return;
    }

    if (currentLine >= TERMINAL_LINES.length) {
      setPhase('pause');
      return;
    }

    const line = TERMINAL_LINES[currentLine];

    if (line.type === 'gap') {
      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, { text: '', type: 'gap' }]);
        setCurrentLine(l => l + 1);
        setCurrentChar(0);
      }, 120);
      return () => clearTimeout(t);
    }

    if (currentChar < line.text.length) {
      const t = setTimeout(() => {
        setCurrentChar(c => c + 1);
      }, CHAR_DELAY + (line.delay ?? 0) / line.text.length);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, { text: line.text, type: line.type }]);
        setCurrentLine(l => l + 1);
        setCurrentChar(0);
      }, 80);
      return () => clearTimeout(t);
    }
  }, [phase, currentLine, currentChar]);

  const currentTyping =
    phase === 'typing' && currentLine < TERMINAL_LINES.length && TERMINAL_LINES[currentLine].type !== 'gap'
      ? { text: TERMINAL_LINES[currentLine].text.slice(0, currentChar), type: TERMINAL_LINES[currentLine].type }
      : null;

  return { visibleLines, currentTyping };
}


/* ── Terminal line color ─────────────────────────────────────────────────── */
function termColor(type: string) {
  switch (type) {
    case 'cmd':     return 'var(--amber)';
    case 'out':     return 'var(--green)';
    case 'arg':     return 'var(--text-secondary)';
    case 'success': return 'var(--green)';
    case 'dim':     return 'var(--text-dim)';
    default:        return 'var(--text-primary)';
  }
}

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
        {/* Logo */}
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

        {/* Center nav */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
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

        {/* CTA */}
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

/* ── Terminal widget ─────────────────────────────────────────────────────── */
function Terminal() {
  const { visibleLines, currentTyping } = useTerminalAnimation();

  return (
    <div style={{
      background: '#060a0e',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(245,158,11,0.05), 0 32px 80px rgba(0,0,0,0.6)',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 1.7,
    }}>
      {/* Terminal header bar */}
      <div style={{
        background: '#0d1219',
        borderBottom: '1px solid var(--border)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>mandate — agent session</span>
        <span style={{ flex: 1 }} />
      </div>

      {/* Terminal body */}
      <div style={{ padding: '20px 20px', minHeight: 380 }}>
        {visibleLines.map((line, i) => (
          <div key={i} style={{
            color: line.type === 'gap' ? 'transparent' : termColor(line.type),
            whiteSpace: 'pre',
            height: line.type === 'gap' ? '0.6em' : undefined,
          }}>
            {line.type === 'success' && (
              <span style={{
                display: 'inline-block', marginRight: 4,
                animation: 'pulse-green 3s infinite',
              }}>●</span>
            )}
            {line.text}
          </div>
        ))}

        {/* Currently typing line */}
        {currentTyping && (
          <div style={{ color: termColor(currentTyping.type), whiteSpace: 'pre' }}>
            {currentTyping.text}
            <span style={{
              display: 'inline-block', width: 7, height: 14,
              background: 'var(--green)', marginLeft: 1, verticalAlign: 'text-bottom',
              animation: 'blink-cursor 1s step-end infinite',
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Feature card ────────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-raised)' : 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--border)' : 'var(--border-dim)'}`,
        borderRadius: 8,
        padding: '28px 28px',
        display: 'flex', flexDirection: 'column', gap: 14,
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        background: 'var(--amber-glow)',
        border: '1px solid var(--amber-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{icon}</div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 500,
          fontSize: 18, letterSpacing: '-0.02em',
          color: 'var(--text-primary)', marginBottom: 8,
        }}>{title}</div>
        <div style={{
          fontSize: 14, lineHeight: 1.65,
          color: 'var(--text-secondary)',
        }}>{description}</div>
      </div>
    </div>
  );
}

/* ── Step ────────────────────────────────────────────────────────────────── */
function Step({ n, title, lines }: { n: number; title: string; lines: string[] }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
          color: 'var(--amber)', flexShrink: 0,
        }}>{n}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 18,
          fontWeight: 500, letterSpacing: '-0.02em',
        }}>{title}</div>
      </div>
      <div style={{ paddingLeft: 44, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            fontSize: 13, fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)', lineHeight: 1.5,
          }}>
            <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>·</span>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Code block ──────────────────────────────────────────────────────────── */
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


/* ── Main page ───────────────────────────────────────────────────────────── */
export default function Landing() {
  const [navOpaque, setNavOpaque] = useState(false);

  useEffect(() => {
    const handleScroll = () => setNavOpaque(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const sharedSectionStyle: React.CSSProperties = {
    maxWidth: 1200, margin: '0 auto', padding: '0 24px',
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Cursor blink keyframe injected once */}
      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .hero-terminal { width: 100% !important; margin-top: 48px; }
          .nav-center { display: none !important; }
          .steps-row { flex-direction: column !important; }
          .steps-connector { display: none !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar opaque={navOpaque} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', paddingTop: 60,
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '5%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '0',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ ...sharedSectionStyle, width: '100%', paddingTop: 80, paddingBottom: 80 }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 64 }}>

            {/* Left: copy */}
            <div style={{ flex: '0 0 50%', maxWidth: 560 }}>
              {/* Badge */}
              <div className="fade-up fade-up-1" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px',
                background: 'var(--amber-glow)',
                border: '1px solid var(--amber-dim)',
                borderRadius: 20, marginBottom: 28,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} className="pulse-amber" />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--amber)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  For AI Agent Developers
                </span>
              </div>

              {/* H1 */}
              <h1 className="fade-up fade-up-2" style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(52px, 5.5vw, 80px)',
                fontWeight: 300,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                margin: '0 0 24px',
              }}>
                Guardrails for<br />
                <span style={{ fontStyle: 'italic' }}>agent wallets.</span>
              </h1>

              {/* Subtitle */}
              <p className="fade-up fade-up-3" style={{
                fontSize: 18, lineHeight: 1.65,
                color: 'var(--text-secondary)',
                margin: '0 0 36px',
                maxWidth: 480,
              }}>
                Policy engine, circuit breakers, and human approval routing. Your private key never leaves your machine.
              </p>

              {/* CTAs */}
              <div className="fade-up fade-up-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
                <a href="/dashboard" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 24px',
                  background: 'var(--amber)', color: '#080c10',
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none', borderRadius: 5,
                  letterSpacing: '-0.01em',
                  transition: 'opacity 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >Register your agent →</a>

                <a href="/claim" style={{
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
                >Read the docs</a>
              </div>

              {/* Proof line */}
              <div className="fade-up fade-up-5" style={{
                display: 'flex', gap: 20, flexWrap: 'wrap',
              }}>
                {['Non-custodial', 'Base/EVM', '15 min to first payment'].map((item, i) => (
                  <span key={i} style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-dim)', letterSpacing: '0.03em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {i > 0 && <span style={{ color: 'var(--border)' }}>·</span>}
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: terminal */}
            <div className="hero-terminal fade-up" style={{
              flex: 1, minWidth: 0,
              animationDelay: '0.3s',
            }}>
              <Terminal />
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ ...sharedSectionStyle }}>
          <div className="stats-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          }}>
            {[
              { label: 'Non-custodial', sub: 'Private keys stay local' },
              { label: '$0 custody risk', sub: 'You sign, we validate' },
              { label: '< 50ms', sub: 'Policy check latency', mono: true },
              { label: '5 states', sub: 'reserved → confirmed', mono: true },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '28px 24px',
                borderRight: i < 3 ? '1px solid var(--border-dim)' : undefined,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div style={{
                  fontFamily: item.mono ? 'var(--font-mono)' : 'var(--font-display)',
                  fontSize: item.mono ? 20 : 22,
                  fontWeight: item.mono ? 500 : 400,
                  color: 'var(--text-primary)',
                  letterSpacing: item.mono ? '-0.03em' : '-0.02em',
                }}>{item.label}</div>
                <div style={{
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-dim)', letterSpacing: '0.03em',
                }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 0' }}>
        <div style={sharedSectionStyle}>
          {/* Section header */}
          <div style={{ marginBottom: 56, maxWidth: 560 }}>
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)',
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
            }}>Policy Engine</div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 3vw, 48px)',
              fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
              margin: 0,
            }}>
              Every transaction, vetted<br />
              <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>before the key is touched.</span>
            </h2>
          </div>

          <div className="features-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
          }}>
            <FeatureCard
              icon="🛡"
              title="Firewall Pattern"
              description="POST /validate before you sign. Policy checks happen server-side; your key never touches our infrastructure. Every transaction intent is evaluated against your rules before execution."
            />
            <FeatureCard
              icon="⚙"
              title="Policy Engine"
              description="Per-tx and daily spend limits, contract allowlists, blocked selectors, schedule restrictions. Fully configurable from the dashboard — no redeploys, instant propagation."
            />
            <FeatureCard
              icon="⚡"
              title="Circuit Breaker"
              description="One API call pauses all agent activity instantly. Anomaly detection trips it automatically on suspicious patterns. Resume with full audit trail when you're confident."
            />
            <FeatureCard
              icon="👤"
              title="Human Approvals"
              description="High-value transactions route to an approval queue. Slack and webhook notifications delivered instantly. Approve or reject directly from the dashboard with one click."
            />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 0 100px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-dim)',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        <div style={sharedSectionStyle}>
          <div style={{ marginBottom: 56 }}>
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)',
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
            }}>Integration</div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 3vw, 48px)',
              fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
              margin: 0,
            }}>
              Three calls.<br />
              <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Complete control.</span>
            </h2>
          </div>

          <div className="steps-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            <Step n={1} title="Register"
              lines={['POST /api/agents/register', 'Get runtimeKey instantly', 'Set spend policies & allowlists']}
            />

            {/* Connector */}
            <div className="steps-connector" style={{
              flex: '0 0 80px', height: 1,
              background: 'linear-gradient(to right, var(--border-dim), var(--amber-dim), var(--border-dim))',
              marginTop: 16, alignSelf: 'flex-start',
            }} />

            <Step n={2} title="Validate"
              lines={['Build tx → compute intentHash', 'POST /api/validate', 'Policy check returns allowed: true']}
            />

            <div className="steps-connector" style={{
              flex: '0 0 80px', height: 1,
              background: 'linear-gradient(to right, var(--border-dim), var(--amber-dim), var(--border-dim))',
              marginTop: 16, alignSelf: 'flex-start',
            }} />

            <Step n={3} title="Execute"
              lines={['Sign locally with viem/ethers', 'Broadcast → POST event', 'Reconciler confirms on-chain']}
            />
          </div>
        </div>
      </section>

      {/* ── Code block ───────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 0' }}>
        <div style={sharedSectionStyle}>
          <div style={{ display: 'flex', gap: 80, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Copy */}
            <div style={{ flex: '0 0 280px' }}>
              <div style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
              }}>Any environment</div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 2.5vw, 40px)',
                fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
                margin: '0 0 16px',
              }}>
                Works from<br />
                <span style={{ fontStyle: 'italic' }}>anywhere.</span>
              </h2>
              <p style={{
                fontSize: 14, lineHeight: 1.65,
                color: 'var(--text-secondary)', margin: 0,
              }}>
                AI agents read the SKILL.md and start making payments in minutes. Just HTTP — no SDK required.
              </p>
            </div>

            {/* Code */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                background: '#040709',
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
              }}>
                {/* Code header */}
                <div style={{
                  background: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border)',
                  padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
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
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                }}>
                  {CODE.split('\n').map((line, i) => {
                    const isComment = line.trim().startsWith('#');
                    const isCurl = line.trim().startsWith('curl') || line.trim().startsWith('-');
                    const isResponse = line.trim().startsWith('# →');
                    return (
                      <span key={i} style={{
                        display: 'block',
                        color: isResponse ? 'var(--green)'
                          : isComment ? 'var(--text-dim)'
                          : isCurl ? 'var(--text-primary)'
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
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '80px 0',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle amber haze */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 200,
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ ...sharedSectionStyle, textAlign: 'center', position: 'relative' }}>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--amber)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20,
          }}>Get started</div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 3.5vw, 52px)',
            fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
            margin: '0 0 20px',
          }}>
            From zero to first on-chain payment<br />
            <span style={{ fontStyle: 'italic' }}>in 15 minutes.</span>
          </h2>

          <p style={{
            fontSize: 16, color: 'var(--text-secondary)',
            margin: '0 0 36px', fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.01em',
          }}>No credit card. No custody. Just policy.</p>

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
          >Register your agent →</a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '32px 0',
      }}>
        <div style={{
          ...sharedSectionStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }}>
          {/* Logo */}
          <span style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 18, fontWeight: 400, color: 'var(--text-dim)',
            letterSpacing: '-0.02em',
          }}>mandate</span>

          {/* Links */}
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Docs', href: '#' },
              { label: 'GitHub', href: '#' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{
                color: 'var(--text-dim)', textDecoration: 'none',
                fontSize: 13, fontFamily: 'var(--font-mono)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >{label}</a>
            ))}
          </div>

          {/* Tagline */}
          <span style={{
            fontSize: 12, fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', letterSpacing: '0.04em',
          }}>Built for the agentic web</span>
        </div>
      </footer>
    </div>
  );
}
