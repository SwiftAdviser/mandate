import ChainBadge from '@/components/ChainBadge';
import { shortAddr } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
  claim_code: string;
  agent_name: string;
  wallet_address: string;
  chain_id: string;
  already_claimed: boolean;
}

export default function Claim({ claim_code, agent_name, wallet_address, chain_id, already_claimed }: Props) {
  const { auth } = usePage<{ auth: { user: any } }>().props;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function claim() {
    if (!auth.user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/claim?code=${claim_code}`)}`;
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/agents/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
        body: JSON.stringify({ claimCode: claim_code }),
      });
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/claim?code=${claim_code}`)}`;
        return;
      }
      if (res.ok) { setDone(true); }
      else {
        const d = await res.json();
        setError(d.error ?? 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(var(--border-dim) 1px, transparent 1px), linear-gradient(90deg, var(--border-dim) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      <div className="fade-up" style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 440,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg-raised)',
        }}>
          <div style={{
            width: 24, height: 24, flexShrink: 0,
          }}>
            <img src="/logo.png" alt="Mandate" style={{ width: 24, height: 24 }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)' }}>mandate</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            agent claim
          </span>
        </div>

        <div style={{ padding: '32px 28px' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>◎</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                Agent claimed.
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>{agent_name}</strong> is now linked to your account.
                Configure its policy from your dashboard.
              </p>
              <a
                href="/dashboard?onboarding=1"
                style={{
                  display: 'inline-block', marginTop: 24,
                  padding: '10px 24px',
                  background: 'var(--accent)',
                  borderRadius: 8,
                  color: '#000',
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Go to set up →
              </a>
            </div>
          ) : already_claimed ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>already claimed</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                {agent_name}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>This agent has already been linked to an account.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Claiming agent
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 20px', color: 'var(--text-primary)' }}>
                  {agent_name}
                </h2>

                {/* Agent details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {wallet_address && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'var(--bg-base)',
                      border: '1px solid var(--border-dim)', borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Address</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {shortAddr(wallet_address)}
                      </span>
                    </div>
                  )}
                  {chain_id && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'var(--bg-base)',
                      border: '1px solid var(--border-dim)', borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Chain</span>
                      <ChainBadge chainId={chain_id} />
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-base)',
                    border: '1px solid var(--border-dim)', borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Claim Code</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{claim_code}</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 24 }}>
                Claiming this agent links it to your Mandate account. You'll be able to set spend limits,
                configure circuit breakers, and approve high-value transactions.
                <br /><br />
                The agent's private key <strong style={{ color: 'var(--text-secondary)' }}>never</strong> leaves the developer's machine.
              </p>

              {error && (
                <div style={{ padding: '10px 14px', background: 'var(--red-glow)', border: '1px solid var(--red-dim)', borderRadius: 8, color: 'var(--red)', fontSize: 12, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                onClick={claim}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 10,
                  color: '#000',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'opacity 0.15s',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Claiming…' : auth.user ? 'Claim agent' : 'Sign in & claim agent'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getCookie(name: string): string | null {
  const v = document.cookie.match('(^|; )' + name + '=([^;]*)');
  return v ? decodeURIComponent(v[2]) : null;
}
