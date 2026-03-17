import CreateAgentModal from '@/components/CreateAgentModal';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatUsd, riskColor, shortAddr, statusColor, timeAgo } from '@/lib/utils';
import { useState } from 'react';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Agent {
  id: string; name: string; evm_address: string; chain_id: number;
  circuit_breaker_active: boolean; claimed_at: string | null;
}
interface QuotaWindow {
  reserved_usd: string; confirmed_usd: string;
  limit_usd: string | null; window_key: string;
}
interface RecentIntent {
  id: string; decoded_action: string | null; amount_usd_computed: string | null;
  status: string; to_address: string; created_at: string; tx_hash: string | null;
  risk_level: string | null; summary: string | null;
  reason: string | null;
}
interface Props {
  agents: Agent[];
  selected_agent: Agent | null;
  daily_quota: QuotaWindow | null;
  monthly_quota: QuotaWindow | null;
  recent_intents: RecentIntent[];
  total_confirmed_today: number;
  pending_approvals: number;
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function Stat({ label, value, mono = true, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{
        fontSize: 22,
        fontWeight: 600,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
        color: accent ?? 'var(--text-primary)',
        letterSpacing: mono ? '-0.04em' : '-0.02em',
      }}>
        {value}
      </div>
    </div>
  );
}

function QuotaBar({ used, limit, label }: { used: number; limit: number | null; label: string }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const danger = pct > 85;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{label}</span>
        <span style={{ fontSize: 11, color: danger ? 'var(--red)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {formatUsd(used)} {limit ? `/ ${formatUsd(limit)}` : '/ ∞'}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: danger ? 'var(--red)' : 'var(--amber)',
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

function CircuitBreakerToggle({ agent }: { agent: Agent }) {
  const [active, setActive] = useState(agent.circuit_breaker_active);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
      const res = await fetch(`/api/agents/${agent.id}/circuit-break`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf) : '',
          'Accept': 'application/json',
        },
      });
      const data = await res.json();
      setActive(data.circuitBreakerActive);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      padding: '16px 20px',
      background: active ? 'var(--red-glow)' : 'var(--bg-raised)',
      border: `1px solid ${active ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      transition: 'all 0.2s',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: active ? 'var(--red)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {active && <span className="pulse-red" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />}
          Circuit Breaker
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          {active ? 'ALL TRANSACTIONS BLOCKED' : 'operational'}
        </div>
      </div>

      {/* Toggle switch */}
      <button
        onClick={toggle}
        disabled={loading}
        title={active ? 'Reset circuit breaker' : 'Trip circuit breaker'}
        style={{
          position: 'relative',
          width: 52,
          height: 28,
          borderRadius: 14,
          background: active ? 'var(--red)' : 'var(--border)',
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3, left: 3,
          width: 22, height: 22,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          transform: active ? 'translateX(24px)' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </button>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function Dashboard({ agents, selected_agent, daily_quota, monthly_quota, recent_intents, total_confirmed_today, pending_approvals }: Props) {
  const agent = selected_agent;
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1100 }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
                margin: 0,
                lineHeight: 1.1,
              }}>
                {agent ? agent.name : 'Overview'}
              </h1>
              {agent && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                    {shortAddr(agent.evm_address)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: agent.circuit_breaker_active ? 'var(--red)' : 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                    {agent.circuit_breaker_active ? 'tripped' : 'operational'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                    chain {agent.chain_id}
                  </span>
                </div>
              )}
            </div>

            {pending_approvals > 0 && (
              <a href="/approvals" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'var(--amber-glow)',
                border: '1px solid var(--amber-dim)',
                borderRadius: 8,
                color: 'var(--amber)',
                fontSize: 12,
                fontWeight: 500,
                textDecoration: 'none',
              }}>
                <span className="pulse-amber" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
                {pending_approvals} pending approval{pending_approvals > 1 ? 's' : ''}
              </a>
            )}
          </div>
        </div>

        {/* Empty state — no agents */}
        {agents.length === 0 && !agent && (
          <div className="fade-up fade-up-1" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '48px 40px',
            textAlign: 'center',
            maxWidth: 520,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              marginBottom: 8,
            }}>
              Welcome to Mandate
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 28,
              lineHeight: 1.6,
            }}>
              Choose how to get started:
            </div>

            {/* Create Agent CTA */}
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '12px 28px',
                background: 'var(--amber)',
                border: 'none',
                borderRadius: 8,
                color: '#000',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                cursor: 'pointer',
                letterSpacing: '-0.02em',
                marginBottom: 8,
              }}
            >
              Create Agent
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 32 }}>
              Get a runtimeKey now
            </div>

            {/* Claim hint */}
            <div style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 32,
            }}>
              Already have a runtimeKey?<br />
              <span style={{ color: 'var(--text-dim)' }}>
                Your agent will appear here after visiting the claim link.
              </span>
            </div>

            {/* Quick Start */}
            <div style={{
              borderTop: '1px solid var(--border-dim)',
              paddingTop: 24,
              textAlign: 'left',
            }}>
              <div style={{
                fontSize: 10,
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}>
                Quick Start
              </div>
              <div style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-dim)',
                borderRadius: 8,
                padding: '12px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-primary)',
                marginBottom: 10,
                textAlign: 'left',
              }}>
                bun add @mandate/sdk
              </div>
              <a
                href="https://github.com/SwiftAdviser/mandate/tree/master/packages/sdk#readme"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                See docs for integration guide →
              </a>
            </div>
          </div>
        )}

        {agent && (
          <>
            {/* Stats row */}
            <div className="fade-up fade-up-1" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 1,
              background: 'var(--border-dim)',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 20,
              border: '1px solid var(--border-dim)',
            }}>
              {[
                { label: 'Confirmed Today', value: formatUsd(total_confirmed_today) },
                { label: 'Daily Quota Used', value: formatUsd(daily_quota ? parseFloat(daily_quota.reserved_usd) : 0) },
                { label: 'Monthly Confirmed', value: formatUsd(monthly_quota ? parseFloat(monthly_quota.confirmed_usd) : 0) },
                { label: 'Pending Approvals', value: String(pending_approvals), accent: pending_approvals > 0 ? 'var(--amber)' : undefined },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '20px 24px',
                  background: 'var(--bg-surface)',
                }}>
                  <Stat label={s.label} value={s.value} accent={s.accent} />
                </div>
              ))}
            </div>

            {/* Middle row */}
            <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 }}>

              {/* Quota */}
              <div style={{
                padding: '20px 24px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                  Spend Quota
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <QuotaBar
                    used={daily_quota ? parseFloat(daily_quota.reserved_usd) + parseFloat(daily_quota.confirmed_usd) : 0}
                    limit={null}
                    label="Today"
                  />
                  <QuotaBar
                    used={monthly_quota ? parseFloat(monthly_quota.reserved_usd) + parseFloat(monthly_quota.confirmed_usd) : 0}
                    limit={null}
                    label="This month"
                  />
                </div>
              </div>

              {/* Circuit breaker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <CircuitBreakerToggle agent={agent} />

                <a href="/policies" style={{
                  display: 'block',
                  padding: '14px 18px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Policy</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 6, fontWeight: 500 }}>Configure spend limits →</div>
                </a>

                <a href="/mandate" style={{
                  display: 'block',
                  padding: '14px 18px',
                  background: 'var(--amber-glow)',
                  border: '1px solid var(--amber-dim)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MANDATE.md</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 6, fontWeight: 500 }}>Write AI guard rules →</div>
                </a>
              </div>
            </div>

            {/* Recent Intents */}
            <div className="fade-up fade-up-3" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-dim)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Recent Intents
                </span>
                <a href="/audit" style={{ fontSize: 11, color: 'var(--text-dim)', textDecoration: 'none' }}>View all →</a>
              </div>

              {recent_intents.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                  No intents yet. Register your agent and make your first call to <span style={{ fontFamily: 'var(--font-mono)' }}>POST /api/validate</span>.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      {['Action', 'Amount', 'Reason', 'Recipient', 'Risk', 'Status', 'Time'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent_intents.map((intent, i) => (
                      <tr key={intent.id} style={{ borderBottom: i < recent_intents.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 11 }}>
                          {intent.summary ?? intent.decoded_action ?? 'unknown'}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)', fontSize: 12 }}>
                          {intent.amount_usd_computed ? formatUsd(parseFloat(intent.amount_usd_computed)) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intent.reason ?? ''}>
                          {intent.reason ? intent.reason.slice(0, 30) + (intent.reason.length > 30 ? '…' : '') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 11 }}>
                          {shortAddr(intent.to_address)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {intent.risk_level && intent.risk_level !== 'SAFE' ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              color: riskColor(intent.risk_level),
                              background: `${riskColor(intent.risk_level)}1a`,
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: `1px solid ${riskColor(intent.risk_level)}33`,
                            }}>
                              {intent.risk_level}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            color: statusColor(intent.status),
                            background: `${statusColor(intent.status)}1a`,
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: `1px solid ${statusColor(intent.status)}33`,
                          }}>
                            {intent.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 11 }}>
                          {timeAgo(intent.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {showCreateModal && (
          <CreateAgentModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    </DashboardLayout>
  );
}
