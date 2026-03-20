import DashboardLayout from '@/layouts/DashboardLayout';
import { shortAddr, formatUsd } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Evidence {
  intent_id: string;
  decision: string;
  amount_usd: string | null;
  to_address: string | null;
  decoded_action: string | null;
  reason: string | null;
  created_at: string | null;
}

interface Insight {
  id: string;
  insight_type: string;
  target_section: string | null;
  status: string;
  confidence: number;
  evidence_count: number;
  evidence: Evidence[];
  suggestion: Record<string, any>;
  title: string;
  description: string | null;
}

interface Props {
  insights: Insight[];
}

function confidenceLabel(c: number): string {
  if (c >= 0.85) return 'STRONG RECOMMENDATION';
  if (c >= 0.7) return 'RECOMMENDATION';
  if (c >= 0.55) return 'EARLY SIGNAL';
  return 'SUGGESTION';
}

function confidenceColor(c: number): string {
  if (c >= 0.85) return 'var(--accent)';
  if (c >= 0.7) return 'var(--green)';
  if (c >= 0.55) return 'var(--yellow, #eab308)';
  return 'var(--text-dim)';
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const blocks = 5;
  const filled = Math.round(confidence * blocks);
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1 }}>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} style={{ color: i < filled ? confidenceColor(confidence) : 'var(--border)' }}>
          {i < filled ? '■' : '□'}
        </span>
      ))}
      {' '}
      <span style={{ color: 'var(--text-dim)' }}>{confidence.toFixed(2)}</span>
    </span>
  );
}

function InsightCard({ insight, onAction }: { insight: Insight; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState<null | 'accept' | 'dismiss'>(null);
  const isMandateRule = insight.insight_type === 'mandate_rule';

  const sectionLabels: Record<string, string> = {
    block: 'Block immediately',
    require_approval: 'Require human approval',
    allow: 'Allow',
  };

  async function act(action: 'accept' | 'dismiss') {
    setActing(action);
    try {
      const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
      const res = await fetch(`/api/insights/${insight.id}/${action}`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf) : '',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        onAction();
      }
    } finally {
      setActing(null);
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${isMandateRule ? 'var(--accent-dim)' : 'var(--border)'}`,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: confidenceColor(insight.confidence),
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            ◆ {isMandateRule ? 'MANDATE.MD RULE' : confidenceLabel(insight.confidence)}
          </span>
          {isMandateRule && insight.target_section && (
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              padding: '1px 6px',
              background: 'var(--bg-base)',
              borderRadius: 4,
              border: '1px solid var(--border-dim)',
            }}>
              {sectionLabels[insight.target_section] ?? insight.target_section}
            </span>
          )}
        </div>
        <ConfidenceBar confidence={insight.confidence} />
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>
          {insight.title}
        </div>

        {/* MANDATE.md rule preview */}
        {isMandateRule && insight.suggestion?.rule_text && (
          <div style={{
            margin: '12px 0',
            padding: '12px 16px',
            background: 'var(--bg-base)',
            border: '1px solid var(--accent-dim)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}>
            {insight.suggestion.rule_text}
          </div>
        )}

        {insight.description && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {insight.description}
          </div>
        )}

        {/* Evidence toggle */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Evidence: {insight.evidence_count} decision{insight.evidence_count !== 1 ? 's' : ''}
          </span>
          {insight.evidence?.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                padding: 0,
              }}
            >
              [{expanded ? 'collapse' : 'expand'}]
            </button>
          )}
        </div>

        {/* Evidence table */}
        {expanded && insight.evidence?.length > 0 && (
          <div style={{
            marginTop: 10,
            background: 'var(--bg-base)',
            border: '1px solid var(--border-dim)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  {['Decision', 'Amount', 'Address', 'Action', 'Date'].map(h => (
                    <th key={h} style={{
                      padding: '6px 10px', textAlign: 'left',
                      color: 'var(--text-dim)', fontWeight: 400,
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insight.evidence.map((e, i) => (
                  <tr key={i} style={{ borderBottom: i < insight.evidence.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: e.decision === 'approved' ? 'var(--green)' : 'var(--red)' }}>
                      {e.decision}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {e.amount_usd ? formatUsd(parseFloat(e.amount_usd)) : '-'}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {e.to_address ? shortAddr(e.to_address) : '-'}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {e.decoded_action ?? '-'}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-dim)' }}>
                      {e.created_at ? new Date(e.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border-dim)',
        display: 'flex',
        gap: 10,
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={() => act('dismiss')}
          disabled={!!acting}
          style={{
            padding: '7px 14px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-dim)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {acting === 'dismiss' ? '...' : 'Dismiss'}
        </button>
        <button
          onClick={() => act('accept')}
          disabled={!!acting}
          style={{
            padding: '7px 14px',
            background: isMandateRule ? 'var(--accent)' : 'var(--accent)',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            color: '#000',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {acting === 'accept' ? '...' : isMandateRule ? 'Add to MANDATE.md' : 'Accept'}
        </button>
      </div>
    </div>
  );
}

export default function Insights({ insights: initialInsights }: Props) {
  const [insights, setInsights] = useState(initialInsights);

  function removeInsight(id: string) {
    setInsights(prev => prev.filter(i => i.id !== id));
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 760 }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400,
              letterSpacing: '-0.03em', margin: 0,
            }}>
              Policy Insights
            </h1>
          </div>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Your policy learns from your approval decisions. Accept suggestions to evolve your rules automatically.
          </p>
        </div>

        {insights.length === 0 ? (
          <div className="fade-up fade-up-1" style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{
              fontSize: 15, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>
              No insights yet.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
              Approve or reject a few transactions and the system will start learning patterns.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {insights.map((insight, i) => (
              <div key={insight.id} className={`fade-up fade-up-${i + 1}`}>
                <InsightCard insight={insight} onAction={() => removeInsight(insight.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
