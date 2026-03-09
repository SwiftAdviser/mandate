import DashboardLayout from '@/layouts/DashboardLayout';
import { formatUsd, shortAddr, statusColor, timeAgo } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Intent {
  id: string; decoded_action: string | null; amount_usd_computed: string | null;
  status: string; to_address: string; created_at: string; tx_hash: string | null;
  chain_id: number; intent_hash: string;
}
interface Props {
  intents: { data: Intent[]; current_page: number; last_page: number };
  filters: { status: string; action: string };
}

const STATUS_OPTS = ['', 'confirmed', 'failed', 'broadcasted', 'reserved', 'approval_pending', 'expired'];
const ACTION_OPTS = ['', 'transfer', 'approve', 'native_transfer', 'swap', 'unknown'];

export default function AuditLog({ intents, filters }: Props) {
  const [status, setStatus] = useState(filters.status);
  const [action, setAction] = useState(filters.action);

  function applyFilters() {
    router.get('/audit', { status, action }, { preserveState: true, replace: true });
  }

  const selectStyle = {
    padding: '7px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    cursor: 'pointer',
  } as const;

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px' }}>

        {/* Header */}
        <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>Audit Log</h1>
            <p style={{ marginTop: 6, color: 'var(--text-dim)', fontSize: 13 }}>Immutable record of every intent — the evidence trail for compliance.</p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
            </select>
            <select value={action} onChange={e => setAction(e.target.value)} style={selectStyle}>
              {ACTION_OPTS.map(a => <option key={a} value={a}>{a || 'All actions'}</option>)}
            </select>
            <button onClick={applyFilters} style={{
              padding: '7px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
            }}>
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="fade-up fade-up-1" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-raised)' }}>
                {['Status', 'Action', 'Amount', 'Recipient', 'Chain', 'Tx Hash', 'Time'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {intents.data.map((intent, i) => (
                <tr
                  key={intent.id}
                  style={{
                    borderBottom: i < intents.data.length - 1 ? '1px solid var(--border-dim)' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: statusColor(intent.status),
                      background: `${statusColor(intent.status)}18`,
                      padding: '2px 8px', borderRadius: 4,
                      border: `1px solid ${statusColor(intent.status)}30`,
                    }}>
                      {intent.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 11 }}>
                    {intent.decoded_action ?? 'unknown'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {intent.amount_usd_computed ? formatUsd(parseFloat(intent.amount_usd_computed)) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 11 }}>
                    {shortAddr(intent.to_address)}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 11 }}>
                    {intent.chain_id}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 11 }}>
                    {intent.tx_hash ? (
                      <span title={intent.tx_hash}>{shortAddr(intent.tx_hash)}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {timeAgo(intent.created_at)}
                  </td>
                </tr>
              ))}
              {intents.data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                    No intents match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {intents.last_page > 1 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-dim)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Page {intents.current_page} / {intents.last_page}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {intents.current_page > 1 && (
                  <button onClick={() => router.get('/audit', { page: intents.current_page - 1 })} style={{ padding: '5px 12px', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>← Prev</button>
                )}
                {intents.current_page < intents.last_page && (
                  <button onClick={() => router.get('/audit', { page: intents.current_page + 1 })} style={{ padding: '5px 12px', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>Next →</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
