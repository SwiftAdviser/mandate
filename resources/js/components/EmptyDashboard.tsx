import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
  runtimeKey: string;
}

export default function EmptyDashboard({ runtimeKey }: Props) {
  const appUrl = (usePage().props as any).app_url ?? '';
  const skillUrl = `${appUrl}/SKILL.md`;
  const [copiedOc, setCopiedOc] = useState(false);
  const [copiedSkill, setCopiedSkill] = useState(false);

  const openclawText = `openclaw plugins install @mandate.md/mandate-openclaw-plugin`;
  const skillText = `Follow ${skillUrl} to add Mandate. Use this runtime_key: ${runtimeKey}`;

  async function copyOc() {
    await navigator.clipboard.writeText(openclawText);
    setCopiedOc(true);
    setTimeout(() => setCopiedOc(false), 2500);
  }

  async function copySkill() {
    await navigator.clipboard.writeText(skillText);
    setCopiedSkill(true);
    setTimeout(() => setCopiedSkill(false), 2500);
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
          Connect your AI agent to Mandate.
        </p>
      </div>

      {/* OpenClaw (recommended) */}
      <div className="fade-up fade-up-1" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--accent-dim)',
        borderRadius: 12,
        padding: '24px',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          <img src="/logos/openclaw.svg" alt="OpenClaw" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
          OpenClaw (recommended)
        </div>

        <div style={{
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
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span style={{ color: 'var(--accent)' }}>openclaw plugins install @mandate.md/mandate-openclaw-plugin</span>
        </div>

        <button
          onClick={copyOc}
          style={{
            width: '100%', padding: '14px',
            background: copiedOc ? 'var(--green-glow)' : 'var(--accent)',
            border: `1px solid ${copiedOc ? 'var(--green)' : 'var(--accent)'}`,
            borderRadius: 8,
            color: copiedOc ? 'var(--green)' : '#000',
            fontSize: 14, fontWeight: 600,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer', letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {copiedOc ? 'Copied!' : 'Copy install command'}
        </button>

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6, textAlign: 'center' }}>
          Plugin auto-registers tools + safety-net hook. Agent self-registers on first run.
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5, opacity: 0.7 }}>
          OpenClaw may show a security warning about "env access + network send". This is expected: the plugin reads your Mandate runtime key and sends policy-check requests to app.mandate.md. No other credentials are accessed.{' '}
          <a href="https://github.com/SwiftAdviser/mandate/tree/master/packages/openclaw-plugin" target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Source is open.</a>
        </div>
      </div>

      {/* Other agents */}
      <div className="fade-up fade-up-2" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '24px',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          Other agents (SDK / SKILL.md)
        </div>

        <div style={{
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
          Point your agent to{' '}
          <span style={{ color: 'var(--accent)' }}>{skillUrl}</span>
          <br />
          runtime_key:{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{runtimeKey}</span>
        </div>

        <button
          onClick={copySkill}
          style={{
            width: '100%', padding: '12px',
            background: copiedSkill ? 'var(--green-glow)' : 'transparent',
            border: `1px solid ${copiedSkill ? 'var(--green)' : 'var(--border)'}`,
            borderRadius: 8,
            color: copiedSkill ? 'var(--green)' : 'var(--text-primary)',
            fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer', letterSpacing: '-0.02em',
            transition: 'all 0.2s',
          }}
        >
          {copiedSkill ? 'Copied!' : 'Copy SKILL.md activation text'}
        </button>
      </div>

      {/* How It Works link */}
      <a href="/how-it-works" className="fade-up fade-up-3" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Check Demo First
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
            See how Mandate protects your agent
          </div>
        </div>
        <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>View →</span>
      </a>
    </div>
  );
}
