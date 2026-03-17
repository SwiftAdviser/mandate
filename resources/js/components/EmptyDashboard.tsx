import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
  runtimeKey: string;
}

export default function EmptyDashboard({ runtimeKey }: Props) {
  const appUrl = (usePage().props as any).app_url ?? '';
  const skillUrl = `${appUrl}/SKILL.md`;
  const [copied, setCopied] = useState(false);

  const activationText = `Follow ${skillUrl} to secure your first agent with Mandate. Use this runtime_key: ${runtimeKey}`;

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
          <span style={{ color: 'var(--accent)' }}>{skillUrl}</span>
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

      {/* How It Works link */}
      <a href="/how-it-works" className="fade-up fade-up-2" style={{
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
            How It Works
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
            8 intelligence checks on every transaction — see a live demo
          </div>
        </div>
        <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>View →</span>
      </a>
    </div>
  );
}
