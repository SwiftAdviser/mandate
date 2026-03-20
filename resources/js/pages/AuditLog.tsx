import DashboardLayout from '@/layouts/DashboardLayout';
import { explorerTxUrl } from '@/lib/chains';
import { formatUsd, riskColor, shortAddr, statusColor, timeAgo } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from 'react-tooltip';

interface Intent {
  id: string; decoded_action: string | null; amount_usd_computed: string | null;
  status: string; to_address: string; created_at: string; tx_hash: string | null;
  chain_id: string; intent_hash: string; risk_level: string | null; summary: string | null;
  reason: string | null; block_reason: string | null;
}
interface Props {
  intents: { data: Intent[]; current_page: number; last_page: number };
  filters: { status: string; action: string };
}

const STATUS_OPTS = ['', 'confirmed', 'failed', 'broadcasted', 'reserved', 'approval_pending', 'preflight', 'expired'];
const ACTION_OPTS = ['', 'transfer', 'approve', 'native_transfer', 'swap', 'unknown'];

function displayStatus(intent: Intent): string {
  if (intent.status === 'failed' && intent.block_reason) return 'blocked';
  return intent.status;
}

function displayStatusColor(intent: Intent): string {
  const ds = displayStatus(intent);
  if (ds === 'blocked') return '#f97316'; // orange, distinct from red "failed"
  return statusColor(intent.status);
}

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
            <p style={{ marginTop: 6, color: 'var(--text-dim)', fontSize: 13 }}>Immutable record of every intent: the evidence trail for compliance.</p>
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
                {([
                  ['Status', 'Current state of this intent (confirmed, failed, blocked, etc.)'],
                  ['Risk', 'Risk level assigned by Mandate security checks'],
                  ['Action', 'Transaction type: transfer, approve, swap, etc.'],
                  ['Amount', 'USD value of this transaction'],
                  ['Reason', 'Why the agent initiated this transaction'],
                  ['Recipient', 'Destination wallet address'],
                  ['Time', 'When this intent was created'],
                  ['Tx Hash', 'On-chain transaction hash with explorer link'],
                ] as const).map(([h, tip]) => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {h}
                      <Info
                        size={12}
                        data-tooltip-id="audit-tip"
                        data-tooltip-content={tip}
                        style={{ opacity: 0.5, cursor: 'help', flexShrink: 0 }}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {intents.data.map((intent, i) => {
                const ds = displayStatus(intent);
                const dsColor = displayStatusColor(intent);

                return (
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
                        color: dsColor,
                        background: `${dsColor}18`,
                        padding: '2px 8px', borderRadius: 4,
                        border: `1px solid ${dsColor}30`,
                        textTransform: 'uppercase',
                        fontWeight: ds === 'blocked' ? 600 : 400,
                      }}>
                        {ds}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {intent.risk_level && intent.risk_level !== 'SAFE' ? (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: riskColor(intent.risk_level),
                          background: `${riskColor(intent.risk_level)}18`,
                          padding: '2px 8px', borderRadius: 4,
                          border: `1px solid ${riskColor(intent.risk_level)}30`,
                        }}>
                          {intent.risk_level}
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 11 }}>
                      {intent.summary ?? intent.decoded_action ?? 'unknown'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {intent.amount_usd_computed ? formatUsd(parseFloat(intent.amount_usd_computed)) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: 200, fontSize: 12 }}>
                      {intent.reason ? (
                        <div
                          style={{
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                          }}
                        >
                          {intent.reason?.startsWith('DEMO INTENT:') ? (
                            <>
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                                color: '#f59e0b', background: 'rgba(245,158,11,0.12)',
                                padding: '1px 6px', borderRadius: 3,
                                border: '1px solid rgba(245,158,11,0.25)',
                                marginRight: 6, letterSpacing: '0.04em',
                              }}>DEMO</span>
                              {intent.reason.slice(13)}
                            </>
                          ) : intent.reason}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>-</span>
                      )}
                      {ds === 'blocked' && intent.block_reason && (
                        <div style={{ marginTop: intent.reason ? 6 : 0, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                          <Info
                            size={13}
                            data-tooltip-id="audit-tip"
                            data-tooltip-content="Reason provided by Mandate AI based on security checks and your MANDATE.md rules"
                            style={{ color: '#f97316', flexShrink: 0, cursor: 'help' }}
                          />
                          <span style={{ color: '#f97316', fontSize: 11, lineHeight: 1.4 }}>
                            {intent.block_reason}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 11 }}>
                      {shortAddr(intent.to_address)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {timeAgo(intent.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {intent.tx_hash ? (() => {
                        const url = explorerTxUrl(intent.chain_id, intent.tx_hash);
                        const short = `${intent.tx_hash.slice(0, 6)}...${intent.tx_hash.slice(-4)}`;
                        return url ? (
                          <a href={url} target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                          >{short}</a>
                        ) : <span style={{ color: 'var(--text-dim)' }}>{short}</span>;
                      })() : <span style={{ color: 'var(--text-dim)' }}>-</span>}
                    </td>
                  </tr>
                );
              })}
              {intents.data.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
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
                  <button onClick={() => router.get('/audit', { page: intents.current_page - 1 })} style={{ padding: '5px 12px', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>Prev</button>
                )}
                {intents.current_page < intents.last_page && (
                  <button onClick={() => router.get('/audit', { page: intents.current_page + 1 })} style={{ padding: '5px 12px', fontSize: 11, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>Next</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Tooltip
        id="audit-tip"
        place="top"
        style={{
          fontSize: 11, maxWidth: 220, borderRadius: 8, padding: '6px 10px',
          background: '#1a1a1a', color: '#ccc', zIndex: 100,
        }}
      />
    </DashboardLayout>
  );
}
