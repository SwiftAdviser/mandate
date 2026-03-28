import CreateAgentModal from '@/components/CreateAgentModal';
import EmptyDashboard from '@/components/EmptyDashboard';
import LiveSimulationDemo from '@/components/LiveSimulationDemo';
import OnboardingWizard from '@/components/OnboardingWizard';
import RuntimeKeyReveal from '@/components/RuntimeKeyReveal';
import DashboardLayout from '@/layouts/DashboardLayout';
import { formatUsd, riskColor, shortAddr, statusColor, timeAgo } from '@/lib/utils';
import ChainBadge from '@/components/ChainBadge';
import { KeyRound, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Agent {
  id: string; name: string; wallet_address: string | null; chain_id: string | null;
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
  daily_limit: number | null;
  monthly_limit: number | null;
  recent_intents: RecentIntent[];
  total_confirmed_today: number;
  pending_approvals: number;
  needs_onboarding: boolean;
  first_visit_key: string | null;
  top_insight: {
    id: string; title: string; description: string | null;
    confidence: number; insight_type: string; evidence_count: number;
  } | null;
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
          background: danger ? 'var(--red)' : 'var(--accent)',
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
export default function Dashboard({ agents, selected_agent, daily_quota, monthly_quota, daily_limit, monthly_limit, recent_intents, total_confirmed_today, pending_approvals, needs_onboarding, first_visit_key, top_insight }: Props) {
  const agent = selected_agent;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const [regenState, setRegenState] = useState<'idle' | 'confirm' | 'loading' | 'reveal'>('idle');
  const [newRuntimeKey, setNewRuntimeKey] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const comingSoonRef = useRef<HTMLDivElement>(null);

  async function deleteAgent() {
    if (!agent || deleting) return;
    setDeleting(true);
    try {
      const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
        headers: {
          'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf) : '',
          'Accept': 'application/json',
        },
      });
      if (res.ok) window.location.reload();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function regenerateKey() {
    if (!agent) return;
    setRegenState('loading');
    try {
      const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
      const res = await fetch(`/api/agents/${agent.id}/regenerate-key`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf) : '',
          'Accept': 'application/json',
        },
      });
      const data = await res.json();
      setNewRuntimeKey(data.runtimeKey);
      setRegenState('reveal');
    } catch {
      setRegenState('idle');
    }
  }

  useEffect(() => {
    if (!showComingSoon) return;
    function handleClickOutside(e: MouseEvent) {
      if (comingSoonRef.current && !comingSoonRef.current.contains(e.target as Node)) {
        setShowComingSoon(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showComingSoon]);

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1100 }}>

        {/* Compact agent info bar */}
        {agent && !first_visit_key && <div className="fade-up" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              margin: 0,
            }}>
              Overview
            </h1>

            {pending_approvals > 0 && (
              <a href="/approvals" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', background: 'var(--accent-glow)',
                border: '1px solid var(--accent-dim)', borderRadius: 6,
                color: 'var(--accent)', fontSize: 11, fontWeight: 500, textDecoration: 'none',
              }}>
                <span className="pulse-accent" style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
                {pending_approvals} pending
              </a>
            )}

            {/* + Add Agent */}
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <button
                onClick={() => setShowComingSoon(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', background: 'var(--bg-raised)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-dim)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <Plus size={12} strokeWidth={2} />
                Add Agent
              </button>
              {showComingSoon && (
                <div ref={comingSoonRef} style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
                  padding: '12px 16px', background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Multi-agent support coming soon</span>
                  <button
                    onClick={() => setShowComingSoon(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Agent info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {agent.name}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: agent.circuit_breaker_active ? 'var(--red)' : 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              {agent.circuit_breaker_active ? 'tripped' : 'operational'}
            </span>
            {agent.wallet_address && (
              <>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {shortAddr(agent.wallet_address)}
                </span>
              </>
            )}
            {agent.chain_id && (
              <>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>
                <ChainBadge chainId={agent.chain_id} />
              </>
            )}
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>

            {/* Regenerate key */}
            {regenState === 'idle' && (
              <button
                onClick={() => setRegenState('confirm')}
                title="Regenerate runtime key"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-dim)', display: 'flex', alignItems: 'center',
                  padding: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >
                <KeyRound size={13} strokeWidth={1.5} />
              </button>
            )}
            {regenState === 'confirm' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>revoke current key?</span>
                <button
                  onClick={regenerateKey}
                  style={{
                    background: 'var(--accent)', border: 'none', borderRadius: 4,
                    color: '#000', fontSize: 10, fontFamily: 'var(--font-mono)',
                    padding: '2px 8px', cursor: 'pointer',
                  }}
                >
                  yes
                </button>
                <button
                  onClick={() => setRegenState('idle')}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                    color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)',
                    padding: '2px 8px', cursor: 'pointer',
                  }}
                >
                  no
                </button>
              </span>
            )}
            {regenState === 'loading' && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>regenerating...</span>
            )}

            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>

            {/* Delete */}
            {confirmDelete ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>delete?</span>
                <button
                  onClick={deleteAgent}
                  disabled={deleting}
                  style={{
                    background: 'var(--red)', border: 'none', borderRadius: 4,
                    color: '#fff', fontSize: 10, fontFamily: 'var(--font-mono)',
                    padding: '2px 8px', cursor: deleting ? 'wait' : 'pointer',
                  }}
                >
                  {deleting ? '...' : 'yes'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                    color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)',
                    padding: '2px 8px', cursor: 'pointer',
                  }}
                >
                  no
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete agent"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-dim)', display: 'flex', alignItems: 'center',
                  padding: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>}

        {/* Key reveal overlay after regeneration */}
        {regenState === 'reveal' && (
          <div className="fade-up" style={{
            padding: '20px 24px', marginBottom: 20,
            background: 'var(--bg-surface)', border: '1px solid var(--accent-dim)',
            borderRadius: 12,
          }}>
            <RuntimeKeyReveal runtimeKey={newRuntimeKey} onDone={() => setRegenState('idle')} />
          </div>
        )}

        {/* First visit — show activation block */}
        {first_visit_key && (
          <EmptyDashboard runtimeKey={first_visit_key} />
        )}

        {/* No agents yet */}
        {!agent && !first_visit_key && (
          <div className="fade-up" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🛡️</div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.03em',
              margin: '0 0 12px',
            }}>
              Welcome to Mandate
            </h1>
            <p style={{
              color: 'var(--text-dim)',
              fontSize: 14,
              lineHeight: 1.7,
              margin: '0 0 32px',
            }}>
              Connect an AI agent to start enforcing spend limits, allowlists, and approval workflows.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/integrations" style={{
                padding: '14px 28px',
                background: 'var(--accent)',
                color: '#09090b',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}>
                Connect an agent
              </a>
              <a href="/how-it-works" style={{
                padding: '14px 28px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}>
                How it works
              </a>
            </div>
          </div>
        )}

        {agent && !first_visit_key && (
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
                { label: 'Pending Approvals', value: String(pending_approvals), accent: pending_approvals > 0 ? 'var(--accent)' : undefined },
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
                    limit={daily_limit}
                    label="Today"
                  />
                  <QuotaBar
                    used={monthly_quota ? parseFloat(monthly_quota.reserved_usd) + parseFloat(monthly_quota.confirmed_usd) : 0}
                    limit={monthly_limit}
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
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent-dim)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MANDATE.md</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 6, fontWeight: 500 }}>Write AI guard rules →</div>
                </a>
              </div>
            </div>

            {/* Insight teaser */}
            {top_insight && (
              <a href="/insights" className="fade-up fade-up-3" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                marginBottom: 16,
                background: 'var(--accent-glow)',
                border: '1px solid var(--accent-dim)',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}>
                <Sparkles size={16} strokeWidth={1.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {top_insight.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {top_insight.evidence_count} decision{top_insight.evidence_count !== 1 ? 's' : ''} analyzed
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  Review →
                </span>
              </a>
            )}

            {/* Recent Intents */}
            <div className={`fade-up fade-up-${top_insight ? 4 : 3}`} style={{
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


            {/* Intelligence layers */}
            <div className="fade-up fade-up-5" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px 24px',
              marginTop: 16,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                What happens when your agent sends a transaction with Mandate
              </div>
              <LiveSimulationDemo />
            </div>
          </>
        )}

        {showCreateModal && (
          <CreateAgentModal onClose={() => setShowCreateModal(false)} />
        )}

        {needs_onboarding && agent && !wizardDismissed && (
          <OnboardingWizard agent={agent} onComplete={() => setWizardDismissed(true)} />
        )}
      </div>
    </DashboardLayout>
  );
}
