export const INTELLIGENCE_LAYERS = [
  { label: 'Transaction Simulation', desc: 'Asset movements, contract interactions, risk signals, anomalies' },
  { label: 'Agent Reputation (EIP-8004)', desc: 'On-chain reputation score for the agent identity' },
  { label: 'Spend Limit Proximity', desc: 'How close this tx brings the agent to daily/monthly limits' },
  { label: 'Prompt Injection Scanner', desc: '18 patterns: instruction overrides, jailbreaks, encoding evasion' },
  { label: 'Recipient Analysis', desc: 'First-time recipient detection, allowlist verification' },
  { label: 'Calldata Decoding', desc: 'Decodes what the tx actually does, not what the agent claims' },
  { label: 'Schedule & Context', desc: 'Operating hours compliance, time-of-day risk patterns' },
  { label: 'Your Rules (MANDATE.md)', desc: 'Natural language rules the AI guard follows alongside all signals' },
];

interface Props {
  compact?: boolean;
}

export default function IntelligenceLayers({ compact }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: compact ? 6 : 8 }}>
      {INTELLIGENCE_LAYERS.map((layer, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8,
          padding: compact ? '8px 10px' : '10px 12px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-dim)',
          borderRadius: 6,
        }}>
          <span style={{ color: 'var(--green)', fontSize: 11, flexShrink: 0, marginTop: 1 }}>&#x2713;</span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{layer.label}</div>
            {!compact && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>{layer.desc}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
