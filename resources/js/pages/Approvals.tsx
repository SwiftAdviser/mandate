import ChainBadge from '@/components/ChainBadge';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatUsd, riskColor, shortAddr, timeAgo } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Intent {
  id: string; decoded_action: string | null;
  to_address: string; amount_usd_computed: string | null;
  calldata: string; chain_id: string; created_at: string;
  risk_level: string | null; risk_degraded: boolean;
  summary: string | null;
  reason: string | null;
}
interface Approval {
  id: string; intent: Intent; agent: { id: string; name: string };
  expires_at: string; status: string;
}
interface Props { approvals: { data: Approval[] } }

function ApprovalCard({ approval, onDecide }: { approval: Approval; onDecide: () => void }) {
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState<null | 'approved' | 'rejected'>(null);
  const expiresIn = Math.max(0, new Date(approval.expires_at).getTime() - Date.now());
  const minsLeft  = Math.floor(expiresIn / 60000);

  async function decide(decision: 'approved' | 'rejected') {
    setDeciding(decision);
    try {
      await fetch(`/api/approvals/${approval.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
        body: JSON.stringify({ decision, note: note || undefined }),
      });
      onDecide();
    } finally {
      setDeciding(null);
    }
  }

  const intent = approval.intent;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="pulse-accent" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              {approval.agent.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {timeAgo(intent.created_at)} · {minsLeft > 0 ? `expires in ${minsLeft}m` : 'expiring soon'}
            </div>
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          {intent.amount_usd_computed ? formatUsd(parseFloat(intent.amount_usd_computed)) : '—'}
        </div>
      </div>

      {/* Intent details */}
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Action</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{intent.summary ?? intent.decoded_action ?? 'unknown'}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Recipient</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{shortAddr(intent.to_address)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Chain</div>
          <ChainBadge chainId={intent.chain_id} />
        </div>
      </div>

      {/* Risk assessment */}
      {intent.risk_level && intent.risk_level !== 'SAFE' && (
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: riskColor(intent.risk_level),
            background: `${riskColor(intent.risk_level)}1a`,
            padding: '2px 8px',
            borderRadius: 4,
            border: `1px solid ${riskColor(intent.risk_level)}33`,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {intent.risk_level} RISK
          </span>
          {intent.risk_degraded && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              (degraded — scan incomplete)
            </span>
          )}
        </div>
      )}

      {/* Agent's reason (WHY) */}
      {intent.reason && (
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-dim)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Why
          </div>
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-base)',
            border: '1px solid var(--border-dim)',
            borderRadius: 6,
            borderLeft: '3px solid var(--accent-dim)',
            fontSize: 13,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "{intent.reason}"
          </div>
        </div>
      )}

      {/* Note + actions */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Decision note to improve rules (optional)"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <button
          onClick={() => decide('rejected')}
          disabled={!!deciding}
          style={{
            padding: '8px 16px',
            background: deciding === 'rejected' ? 'var(--red-glow)' : 'transparent',
            border: '1px solid var(--red-dim)',
            borderRadius: 8,
            color: 'var(--red)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          {deciding === 'rejected' ? '…' : 'Reject'}
        </button>
        <button
          onClick={() => decide('approved')}
          disabled={!!deciding}
          style={{
            padding: '8px 16px',
            background: deciding === 'approved' ? 'var(--green-glow)' : 'var(--accent)',
            border: `1px solid ${deciding === 'approved' ? 'var(--green)' : 'var(--accent)'}`,
            borderRadius: 8,
            color: deciding === 'approved' ? 'var(--green)' : '#000',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          {deciding === 'approved' ? '✓ Approved' : 'Approve →'}
        </button>
      </div>
    </div>
  );
}

export default function Approvals({ approvals }: Props) {
  const [items, setItems] = useState(approvals.data);
  const [toast, setToast] = useState<string | null>(null);

  function remove(id: string) {
    setItems(prev => prev.filter(a => a.id !== id));
    // Show insight toast briefly
    setToast('New insight available.');
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 760 }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>
            Approval Queue
          </h1>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            These intents exceeded your policy threshold and require human sign-off before broadcast.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="fade-up fade-up-1" style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              All clear.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
              No intents awaiting approval.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((a, i) => (
              <div key={a.id} className={`fade-up fade-up-${i + 1}`}>
                <ApprovalCard approval={a} onDecide={() => remove(a.id)} />
              </div>
            ))}
          </div>
        )}
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 100,
            padding: '10px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--accent-dim)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'fadeIn 0.2s ease',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{toast}</span>
            <a href="/insights" style={{
              fontSize: 11, color: 'var(--accent)', textDecoration: 'none',
              fontFamily: 'var(--font-mono)',
            }}>
              Review →
            </a>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function getCookie(name: string): string | null {
  const v = document.cookie.match('(^|; )' + name + '=([^;]*)');
  return v ? decodeURIComponent(v[2]) : null;
}
