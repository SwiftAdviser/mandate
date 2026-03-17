import LiveSimulationDemo from '@/components/LiveSimulationDemo';
import DashboardLayout from '@/layouts/DashboardLayout';

const LAYER_LABELS = [
  'Simulation', 'Reputation', 'Spend Limits', 'Injection Scan',
  'Recipient', 'Calldata', 'Schedule', 'Your Rules',
];

function ShieldVisual() {
  return (
    <div style={{ position: 'relative', width: '100%', padding: '24px 0 16px', overflow: 'hidden' }}>
      <style>{`
        @keyframes shield-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes layer-scan { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginRight: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>agent tx</div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-glow)', border: '1.5px solid var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'shield-pulse 3s ease infinite' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, position: 'relative' }}>
          {LAYER_LABELS.map((label, i) => {
            const isInj = i === 3;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: isInj ? 52 : 48, height: 56, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
                  background: isInj ? 'linear-gradient(180deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' : 'linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)',
                  border: `1px solid ${isInj ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.15)'}`,
                  animation: `shield-pulse ${2 + i * 0.3}s ease infinite`,
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: isInj ? 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.08) 50%, transparent 100%)' : 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.06) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: `layer-scan ${3 + i * 0.5}s linear infinite` }} />
                  {isInj ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L2 4v4c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V4L8 1.5z" stroke="#ef4444" strokeWidth="1.2" fill="rgba(239,68,68,0.1)"/><path d="M6 8l1.5 1.5L10 6" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M5 8l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: isInj ? 'var(--red)' : 'var(--text-dim)', textAlign: 'center', lineHeight: 1.2, maxWidth: 52, fontWeight: isInj ? 600 : 400 }}>{label}</div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', top: '50%', left: -8, right: -8, height: 1, background: 'linear-gradient(90deg, var(--accent-dim), var(--accent), var(--accent-dim))', opacity: 0.3, transform: 'translateY(-8px)', zIndex: -1 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginLeft: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>allowed</div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-glow)', border: '1.5px solid var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 720 }}>

        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400,
            letterSpacing: '-0.03em', margin: 0,
          }}>
            How It Works
          </h1>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Every transaction your agent makes passes through 8 intelligence checks — before the key is ever touched.
          </p>
        </div>

        {/* Shield visualization */}
        <div className="fade-up fade-up-1" style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '8px 20px 16px', marginBottom: 20,
        }}>
          <ShieldVisual />
        </div>

        {/* Live simulation demo */}
        <div className="fade-up fade-up-2" style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px',
        }}>
          <div style={{
            fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
          }}>
            What happens when your agent sends a transaction with Mandate
          </div>
          <LiveSimulationDemo />
        </div>

        {/* Integrations link */}
        <a href="/integrations" className="fade-up fade-up-3" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', marginTop: 20,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, textDecoration: 'none', transition: 'border-color 0.15s',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Integrations
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
              SDK, plugins, and SKILL.md — connect your agent in 3 lines
            </div>
          </div>
          <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>View →</span>
        </a>
      </div>
    </DashboardLayout>
  );
}
