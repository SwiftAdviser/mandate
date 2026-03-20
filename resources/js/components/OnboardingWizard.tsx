import ChainBadge from '@/components/ChainBadge';
import { MANDATE_PREFILL, MANDATE_TEMPLATES, POLICY_PRESETS } from '@/lib/defaults';
import MarkdownEditor from '@/components/MarkdownEditor';
import type { MandateTemplateKey } from '@/lib/defaults';
import LiveSimulationDemo from '@/components/LiveSimulationDemo';
import { useState, useEffect, useRef } from 'react';

interface Agent {
  id: string;
  name: string;
  wallet_address: string | null;
  chain_id: string | null;
}

interface Props {
  agent: Agent;
  onComplete: () => void;
}

type PresetKey = keyof typeof POLICY_PRESETS;

const TOTAL_STEPS = 5;
const STORAGE_KEY = 'mandate_onboarding_step';

function getXsrf(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function apiPost(url: string, body: Record<string, unknown>) {
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': getXsrf(),
    },
    body: JSON.stringify(body),
  });
}

export default function OnboardingWizard({ agent, onComplete }: Props) {
  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Step 1: Spend Limits
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('standard');
  const [perTx, setPerTx] = useState<number>(POLICY_PRESETS.standard.perTx);
  const [perDay, setPerDay] = useState<number>(POLICY_PRESETS.standard.perDay);
  const [perMonth, setPerMonth] = useState<number>(POLICY_PRESETS.standard.perMonth);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Step 2: MANDATE.md
  const [guardRules, setGuardRules] = useState(MANDATE_PREFILL);
  const [savingRules, setSavingRules] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MandateTemplateKey | null>(null);

  // Step 3: Telegram
  const [linkCode, setLinkCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const [testingSend, setTestingSend] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  function goTo(target: number) {
    if (animating || target === step) return;
    setDirection(target > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(target);
      setAnimating(false);
    }, 200);
  }

  function next() { goTo(step + 1); }

  function selectPreset(key: PresetKey) {
    setSelectedPreset(key);
    const p = POLICY_PRESETS[key];
    setPerTx(p.perTx as number);
    setPerDay(p.perDay as number);
    setPerMonth(p.perMonth as number);
  }

  function selectMandateTemplate(key: MandateTemplateKey) {
    setGuardRules(MANDATE_TEMPLATES[key].content);
    setSelectedTemplate(key);
  }

  async function saveSpendLimits() {
    setSavingPolicy(true);
    await apiPost(`/api/agents/${agent.id}/policies`, {
      spendLimitPerTxUsd: perTx,
      spendLimitPerDayUsd: perDay,
      spendLimitPerMonthUsd: perMonth,
    });
    setSavingPolicy(false);
    next();
  }

  async function saveGuardRules() {
    setSavingRules(true);
    await apiPost(`/api/agents/${agent.id}/policies`, {
      guardRules,
    });
    setSavingRules(false);
    next();
  }

  async function verifyTelegramCode(code: string) {
    if (code.length !== 8) return;
    setVerifyingCode(true);
    setTelegramError('');
    const res = await apiPost('/api/telegram/verify-code', {
      code: code.toUpperCase(),
      agent_id: agent.id,
    });
    if (res.ok) {
      setTelegramLinked(true);
    } else {
      const data = await res.json();
      setTelegramError(data.error ?? 'Verification failed.');
    }
    setVerifyingCode(false);
  }

  function handleCodeInput(value: string) {
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    setLinkCode(clean);
    setTelegramError('');
    if (clean.length === 8) {
      verifyTelegramCode(clean);
    }
  }

  async function sendTestNotification() {
    setTestingSend(true);
    const res = await fetch(`/api/agents/${agent.id}/webhooks/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': getXsrf(),
      },
    });
    if (res.ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
    setTestingSend(false);
  }

  function finish() {
    sessionStorage.removeItem(STORAGE_KEY);
    onComplete();
  }

  /* ── Styles ─────────────────────────────────────────────── */
  const btnPrimary: React.CSSProperties = {
    padding: '12px 28px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: '#000',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    letterSpacing: '-0.02em',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
  };

  const btnPreset = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? 'var(--accent)' : 'var(--bg-base)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-dim)'}`,
    borderRadius: 6,
    color: active ? '#000' : 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
  });

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 620,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '36px 32px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  };

  const stepLabel: React.CSSProperties = {
    fontSize: 10,
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 16,
  };

  const stepTitle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 400,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    margin: '0 0 12px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  /* ── Steps ──────────────────────────────────────────────── */
  const steps = [
    // Step 0: Welcome
    <div key={0} style={cardStyle}>
      <div style={stepLabel}>Step 1 of {TOTAL_STEPS}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(34,197,94,0.1)',
          border: '2px solid var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 24, color: 'var(--green)',
        }}>
          &#x2713;
        </div>
        <h2 style={stepTitle}>Your agent is connected</h2>
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-dim)',
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{agent.name}</span>
            {agent.chain_id && <ChainBadge chainId={agent.chain_id} />}
          </div>
          {agent.wallet_address && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {agent.wallet_address}
            </div>
          )}
        </div>
        <p style={{
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
          margin: '0 auto 24px', maxWidth: 460, textAlign: 'center',
        }}>
          You're about to configure an intelligence layer that approves, blocks, or escalates every transaction. No session keys. No blind trust.
        </p>
        <button onClick={next} style={btnPrimary}>Set up guard</button>
      </div>
    </div>,

    // Step 1: Spend Limits
    <div key={1} style={cardStyle}>
      <div style={stepLabel}>Step 2 of {TOTAL_STEPS}</div>
      <h2 style={stepTitle}>Spend Limits</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, marginTop: 0 }}>
        Set maximum amounts your agent can spend.
      </p>

      {/* Presets */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Use our default presets
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.keys(POLICY_PRESETS) as PresetKey[]).map(key => (
            <button key={key} onClick={() => selectPreset(key)} style={btnPreset(key === selectedPreset)}>
              {POLICY_PRESETS[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Input fields */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Or write yours
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {([
            ['Per Transaction', perTx, (v: number) => setPerTx(v)] as const,
            ['Per Day', perDay, (v: number) => setPerDay(v)] as const,
            ['Per Month', perMonth, (v: number) => setPerMonth(v)] as const,
          ]).map(([label, value, setter]) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {label} ($)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={e => {
                  const raw = e.target.value.replace(',', '.');
                  const num = parseFloat(raw);
                  if (raw === '' || raw === '.' || !isNaN(num)) {
                    setter(raw === '' || raw === '.' ? 0 : num);
                    setSelectedPreset('' as PresetKey);
                  }
                }}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <button onClick={saveSpendLimits} disabled={savingPolicy} style={btnPrimary}>
          {savingPolicy ? 'Saving...' : 'Set limits & continue'}
        </button>
      </div>
    </div>,

    // Step 2: MANDATE.md
    <div key={2} style={cardStyle}>
      <div style={stepLabel}>Step 3 of {TOTAL_STEPS}</div>
      <h2 style={stepTitle}>MANDATE.md</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12, marginTop: 0 }}>
        Write rules for your AI guard. Tell it when to block, ask you, or allow.
      </p>

      {/* Template presets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(Object.keys(MANDATE_TEMPLATES) as MandateTemplateKey[]).map(key => (
          <button key={key} onClick={() => selectMandateTemplate(key)} style={btnPreset(key === selectedTemplate)}>
            {MANDATE_TEMPLATES[key].label}
          </button>
        ))}
      </div>

      <MarkdownEditor
        value={guardRules}
        onChange={setGuardRules}
        placeholder="Write rules for your AI guard..."
        minHeight={200}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={saveGuardRules} disabled={savingRules} style={btnPrimary}>
          {savingRules ? 'Saving...' : 'Save rules & continue'}
        </button>
      </div>
    </div>,

    // Step 3: Telegram
    <div key={3} style={cardStyle}>
      <div style={stepLabel}>Step 4 of {TOTAL_STEPS}</div>
      <h2 style={stepTitle}>Telegram Notifications</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, marginTop: 0 }}>
        Get approval requests directly in Telegram.
      </p>

      {telegramLinked ? (
        <div style={{
          padding: '16px 18px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 10,
          textAlign: 'center',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>&#x2713;</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>Telegram linked successfully</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            You'll receive approval requests in Telegram.
          </div>
        </div>
      ) : (
        <>
          <div style={{
            padding: '16px 18px',
            background: 'var(--bg-base)',
            border: '1px solid var(--border-dim)',
            borderRadius: 10,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>1.</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Open{' '}
                  <a href="https://t.me/mandatemd_bot" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                    @mandatemd_bot
                  </a>{' '}
                  in Telegram
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>2.</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Press <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>/start</span>. You'll get an 8-character code.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>3.</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Paste the code below:</span>
              </div>
            </div>
          </div>

          <input
            ref={codeInputRef}
            type="text"
            value={linkCode}
            onChange={e => handleCodeInput(e.target.value)}
            placeholder="ABCD1234"
            maxLength={8}
            disabled={verifyingCode}
            style={{
              ...inputStyle,
              textAlign: 'center',
              fontSize: 18,
              letterSpacing: '0.15em',
              fontWeight: 600,
              padding: '14px 12px',
            }}
          />

          {verifyingCode && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 8 }}>
              Verifying...
            </div>
          )}
          {telegramError && (
            <div style={{ fontSize: 12, color: 'var(--red, #ef4444)', textAlign: 'center', marginTop: 8 }}>
              {telegramError}
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        {telegramLinked && (
          <button
            onClick={sendTestNotification}
            disabled={testingSend}
            style={{
              ...btnSecondary,
              color: testSent ? 'var(--green)' : 'var(--text-secondary)',
            }}
          >
            {testSent ? 'Test sent' : testingSend ? 'Sending...' : 'Send test'}
          </button>
        )}
        <button onClick={next} style={telegramLinked ? btnPrimary : btnSecondary}>
          {telegramLinked ? 'Continue' : 'Skip for now'}
        </button>
      </div>
    </div>,

    // Step 4: Simulator
    <div key={4} style={{ ...cardStyle, maxWidth: 680 }}>
      <div style={stepLabel}>Step 5 of {TOTAL_STEPS}</div>
      <h2 style={stepTitle}>See your guard in action</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, marginTop: 0 }}>
        Watch how Mandate detects and blocks a social engineering attack in real time.
      </p>

      <LiveSimulationDemo agentId={agent.id} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <a href="/audit" onClick={() => { sessionStorage.removeItem(STORAGE_KEY); }} style={btnPrimary}>Check Audit Log</a>
      </div>
    </div>,
  ];

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '60px 24px 24px',
      overflowY: 'auto',
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        height: 3,
        background: 'var(--border)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
          background: 'var(--accent)',
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Skip button */}
      <button
        onClick={finish}
        style={{
          position: 'absolute',
          top: 24,
          right: 28,
          background: 'none',
          border: 'none',
          color: 'var(--text-dim)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
        }}
      >
        skip wizard
      </button>

      <div
        key={step}
        style={{
          opacity: animating ? 0 : 1,
          transform: animating
            ? `translateY(${direction === 'forward' ? '12px' : '-12px'})`
            : 'translateY(0)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        {steps[step]}
      </div>
    </div>
  );
}
