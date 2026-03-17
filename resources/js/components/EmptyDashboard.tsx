import LiveSimulationDemo from '@/components/LiveSimulationDemo';
import { useState } from 'react';

interface Props {
  runtimeKey: string;
}

const SKILL_URL = 'https://app.mandate.md/SKILL.md';

const LAYER_LABELS = [
  'Simulation', 'Reputation', 'Spend Limits', 'Injection Scan',
  'Recipient', 'Calldata', 'Schedule', 'Your Rules',
];

function ShieldVisual() {
  return (
    <div style={{ position: 'relative', width: '100%', padding: '24px 0 16px', overflow: 'hidden' }}>
      <style>{`
        @keyframes shield-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes layer-scan { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Incoming tx */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginRight: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>agent tx</div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-glow)', border: '1.5px solid var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'shield-pulse 3s ease infinite' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        {/* 8 layers */}
        <div style={{ display: 'flex', gap: 3, position: 'relative' }}>
          {LAYER_LABELS.map((label, i) => {
            const isInj = i === 3;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: isInj ? 52 : 48, height: 56, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
                  background: isInj ? 'linear-gradient(180deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' : 'linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)',
                  border: `1px solid ${isInj ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.15)'}`,
                  animation: `shield-pulse ${2 + i * 0.3}s ease infinite`,
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: isInj ? 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.08) 50%, transparent 100%)' : 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.06) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: `layer-scan ${3 + i * 0.5}s linear infinite` }} />
                  {isInj ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L2 4v4c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V4L8 1.5z" stroke="#ef4444" strokeWidth="1.2" fill="rgba(239,68,68,0.1)"/><path d="M6 8l1.5 1.5L10 6" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M5 8l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: isInj ? 'var(--red)' : 'var(--text-dim)', textAlign: 'center', lineHeight: 1.2, maxWidth: 52, fontWeight: isInj ? 600 : 400 }}>{label}</div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', top: '50%', left: -8, right: -8, height: 1, background: 'linear-gradient(90deg, var(--accent-dim), var(--accent), var(--accent-dim))', opacity: 0.3, transform: 'translateY(-8px)', zIndex: -1 }} />
        </div>
        {/* Result */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginLeft: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>allowed</div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-glow)', border: '1.5px solid var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmptyDashboard({ runtimeKey }: Props) {
  const [copied, setCopied] = useState(false);

  const activationText = `Follow ${SKILL_URL} to secure your first agent with Mandate. Use this runtime_key: ${runtimeKey}`;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(activationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fade-up" style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: '-0.03em',
          margin: 0,
        }}>
          Quick Start
        </h1>
        <p style={{
          marginTop: 8,
          color: 'var(--text-dim)',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          Share this with your AI agent to connect it to Mandate.
        </p>
      </div>

      {/* Activation block */}
      <div className="fade-up fade-up-1" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '24px',
        marginBottom: 16,
      }}>
        {/* Copyable text */}
        <div style={{
          position: 'relative',
          padding: '16px 18px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-dim)',
          borderRadius: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          wordBreak: 'break-all',
          marginBottom: 16,
        }}>
          Follow{' '}
          <span style={{ color: 'var(--accent)' }}>{SKILL_URL}</span>
          {' '}to secure your first agent with Mandate. Use this runtime_key:{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{runtimeKey}</span>
        </div>

        {/* CTA button */}
        <button
          onClick={copyToClipboard}
          style={{
            width: '100%',
            padding: '14px',
            background: copied ? 'var(--green-glow)' : 'var(--accent)',
            border: `1px solid ${copied ? 'var(--green)' : 'var(--accent)'}`,
            borderRadius: 8,
            color: copied ? 'var(--green)' : '#000',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Copy &amp; share with your AI agent
            </>
          )}
        </button>

        <div style={{
          marginTop: 12,
          fontSize: 11,
          color: 'var(--text-dim)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          Paste this into your agent's chat, config, or SKILL.md file.
          <br />
          The agent will self-integrate and send you an onboarding link.
        </div>
      </div>

      {/* How It Works */}
      <div className="fade-up fade-up-2" style={{ marginBottom: 16 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '-0.03em',
          margin: 0,
          color: 'var(--text-primary)',
        }}>
          How It Works
        </h2>
        <p style={{
          marginTop: 6,
          color: 'var(--text-dim)',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          Every transaction your agent makes passes through 8 intelligence checks — before the key is ever touched. Here's a real scenario.
        </p>
      </div>

      {/* Shield visualization — animated pipeline */}
      <div className="fade-up fade-up-3" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '8px 20px 16px',
        marginBottom: 16,
      }}>
        <ShieldVisual />
      </div>

      {/* Live simulation demo */}
      <div className="fade-up fade-up-4" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{
          fontSize: 10,
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 14,
        }}>
          What happens when your agent sends a transaction with Mandate
        </div>
        <LiveSimulationDemo />
      </div>
    </div>
  );
}
