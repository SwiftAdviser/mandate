import DashboardLayout from '@/layouts/DashboardLayout';
import { formatUsd } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { TokenUSDC, TokenUSDT, TokenETH } from '@web3icons/react';
import { useEffect, useState } from 'react';

interface Policy {
  id?: string;
  spend_limit_per_tx_usd: string;
  spend_limit_per_day_usd: string;
  spend_limit_per_month_usd: string;
  require_approval_above_usd: string;
  allowed_addresses: string[];
  allowed_contracts: string[];
  blocked_selectors: string[];
  max_gas_limit: string;
  schedule: { days: string[]; hours: number[] } | null;
  guard_rules: string | null;
}

interface Props {
  agent_id: string;
  current_policy: Policy | null;
}

const POPULAR_ADDRESSES = [
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', Icon: TokenUSDC },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', Icon: TokenUSDT },
  { symbol: 'ETH',  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', Icon: TokenETH },
] as const;

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</label>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, prefix = '$', placeholder }: { value: string; onChange: (v: string) => void; prefix?: string; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <span style={{ padding: '9px 12px', fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
        {prefix}
      </span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'unlimited'}
        style={{
          flex: 1,
          padding: '9px 12px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
        }}
      />
    </div>
  );
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  }

  return (
    <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: values.length ? 8 : 0 }}>
        {values.map(v => (
          <span key={v} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 8px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
          }}>
            {v.length > 16 ? `${v.slice(0, 8)}…${v.slice(-4)}` : v}
            <button onClick={() => onChange(values.filter(x => x !== v))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)',
            padding: '4px 4px',
          }}
        />
        <button onClick={add} style={{
          padding: '4px 10px', fontSize: 11, background: 'var(--bg-raised)',
          border: '1px solid var(--border)', borderRadius: 4,
          color: 'var(--text-secondary)', cursor: 'pointer',
        }}>Add</button>
      </div>
    </div>
  );
}

function cleanNum(v: string | null | undefined): string {
  if (!v) return '';
  const n = parseFloat(v);
  return isNaN(n) ? '' : String(n);
}

export default function PolicyBuilder({ agent_id, current_policy }: Props) {
  const cp = current_policy;
  const [form, setForm] = useState({
    spendLimitPerTxUsd:      cleanNum(cp?.spend_limit_per_tx_usd),
    spendLimitPerDayUsd:     cleanNum(cp?.spend_limit_per_day_usd),
    spendLimitPerMonthUsd:   cleanNum(cp?.spend_limit_per_month_usd),
    requireApprovalAboveUsd: cleanNum(cp?.require_approval_above_usd),
    allowedAddresses:        cp?.allowed_addresses ?? [],
    allowedContracts:        cp?.allowed_contracts ?? [],
    blockedSelectors:        cp?.blocked_selectors ?? [],
    maxGasLimit:             cp?.max_gas_limit ?? '',
    scheduleDays:            cp?.schedule?.days ?? [],
    scheduleHours:           cp?.schedule?.hours ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!current_policy) return;
    setForm({
      spendLimitPerTxUsd:      cleanNum(current_policy.spend_limit_per_tx_usd),
      spendLimitPerDayUsd:     cleanNum(current_policy.spend_limit_per_day_usd),
      spendLimitPerMonthUsd:   cleanNum(current_policy.spend_limit_per_month_usd),
      requireApprovalAboveUsd: cleanNum(current_policy.require_approval_above_usd),
      allowedAddresses:        current_policy.allowed_addresses ?? [],
      allowedContracts:        current_policy.allowed_contracts ?? [],
      blockedSelectors:        current_policy.blocked_selectors ?? [],
      maxGasLimit:             current_policy.max_gas_limit ?? '',
      scheduleDays:            current_policy.schedule?.days ?? [],
      scheduleHours:           current_policy.schedule?.hours ?? [],
    });
  }, [current_policy?.id]);

  function toggleDay(day: string) {
    setForm(f => ({
      ...f,
      scheduleDays: f.scheduleDays.includes(day)
        ? f.scheduleDays.filter(d => d !== day)
        : [...f.scheduleDays, day],
    }));
  }

  function toggleHour(h: number) {
    setForm(f => ({
      ...f,
      scheduleHours: f.scheduleHours.includes(h)
        ? f.scheduleHours.filter(x => x !== h)
        : [...f.scheduleHours, h],
    }));
  }

  async function save() {
    setSaving(true);
    const schedule = form.scheduleDays.length || form.scheduleHours.length
      ? { days: form.scheduleDays, hours: form.scheduleHours }
      : null;

    try {
      await fetch(`/api/agents/${agent_id}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
        body: JSON.stringify({
          spendLimitPerTxUsd:      form.spendLimitPerTxUsd      || null,
          spendLimitPerDayUsd:     form.spendLimitPerDayUsd     || null,
          spendLimitPerMonthUsd:   form.spendLimitPerMonthUsd   || null,
          requireApprovalAboveUsd: form.requireApprovalAboveUsd || null,
          allowedAddresses:        form.allowedAddresses.length ? form.allowedAddresses : null,
          allowedContracts:        form.allowedContracts.length ? form.allowedContracts : null,
          blockedSelectors:        form.blockedSelectors.length ? form.blockedSelectors : null,
          maxGasLimit:             form.maxGasLimit             || null,
          schedule,
        }),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); router.reload(); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 860 }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>
            Policy Builder
          </h1>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Define guardrails for your agent. Saving creates a new policy version — previous intents are unaffected.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* MANDATE.md */}
          <a href="/mandate" className="fade-up fade-up-1" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                AI Guard
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                MANDATE.md
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                {current_policy?.guard_rules ? 'Rules configured' : 'No rules set — write natural language rules for your AI guard'}
              </div>
            </div>
            <span style={{ color: 'var(--accent)', fontSize: 14 }}>Edit rules →</span>
          </a>

          {/* Spend limits */}
          <div className="fade-up fade-up-2" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              Spend Limits
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <Field label="Per Transaction" hint="Max USD per single intent">
                <NumInput value={form.spendLimitPerTxUsd} onChange={v => setForm(f => ({ ...f, spendLimitPerTxUsd: v }))} />
              </Field>
              <Field label="Per Day" hint="Rolling 24h window">
                <NumInput value={form.spendLimitPerDayUsd} onChange={v => setForm(f => ({ ...f, spendLimitPerDayUsd: v }))} />
              </Field>
              <Field label="Per Month" hint="Calendar month">
                <NumInput value={form.spendLimitPerMonthUsd} onChange={v => setForm(f => ({ ...f, spendLimitPerMonthUsd: v }))} />
              </Field>
            </div>
          </div>

          {/* Human-in-the-loop */}
          <div className="fade-up fade-up-3" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              Human-in-the-Loop
            </div>
            <Field label="Require approval above" hint="Intents above this USD amount route to your approval queue before broadcast">
              <NumInput value={form.requireApprovalAboveUsd} onChange={v => setForm(f => ({ ...f, requireApprovalAboveUsd: v }))} placeholder="disabled" />
            </Field>
          </div>

          {/* Address controls */}
          <div className="fade-up fade-up-4" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              Address Controls
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Allowed addresses" hint="If set, agent may only send to these addresses. Leave empty to allow all.">
                <TagInput values={form.allowedAddresses} onChange={v => setForm(f => ({ ...f, allowedAddresses: v }))} placeholder="0x… (enter to add)" />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {POPULAR_ADDRESSES.map(({ symbol, address, Icon }) => {
                    const added = form.allowedAddresses.some(a => a.toLowerCase() === address.toLowerCase());
                    return (
                      <button
                        key={symbol}
                        onClick={() => {
                          if (!added) setForm(f => ({ ...f, allowedAddresses: [...f.allowedAddresses, address] }));
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 6,
                          border: '1px solid',
                          cursor: added ? 'default' : 'pointer',
                          transition: 'all 0.12s',
                          background: added ? 'var(--accent-glow)' : 'var(--bg-base)',
                          borderColor: added ? 'var(--accent-dim)' : 'var(--border)',
                          color: added ? 'var(--accent)' : 'var(--text-dim)',
                          opacity: added ? 0.6 : 1,
                        }}
                      >
                        <Icon variant="branded" size={14} />
                        {symbol}
                        {added && <span style={{ fontSize: 10 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Allowed contracts" hint="If set, agent may only interact with these contracts. Leave empty to allow all.">
                <TagInput values={form.allowedContracts} onChange={v => setForm(f => ({ ...f, allowedContracts: v }))} placeholder="0x… contract address (enter to add)" />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {POPULAR_ADDRESSES.filter(a => a.symbol !== 'ETH').map(({ symbol, address, Icon }) => {
                    const added = form.allowedContracts.some(a => a.toLowerCase() === address.toLowerCase());
                    return (
                      <button
                        key={symbol}
                        onClick={() => {
                          if (!added) setForm(f => ({ ...f, allowedContracts: [...f.allowedContracts, address] }));
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 6,
                          border: '1px solid',
                          cursor: added ? 'default' : 'pointer',
                          transition: 'all 0.12s',
                          background: added ? 'var(--accent-glow)' : 'var(--bg-base)',
                          borderColor: added ? 'var(--accent-dim)' : 'var(--border)',
                          color: added ? 'var(--accent)' : 'var(--text-dim)',
                          opacity: added ? 0.6 : 1,
                        }}
                      >
                        <Icon variant="branded" size={14} />
                        {symbol}
                        {added && <span style={{ fontSize: 10 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Blocked selectors" hint="4-byte function selectors to block (e.g. 0x23b872dd for transferFrom)">
                <TagInput values={form.blockedSelectors} onChange={v => setForm(f => ({ ...f, blockedSelectors: v }))} placeholder="0x… selector" />
              </Field>
            </div>
          </div>

          {/* Schedule */}
          <div className="fade-up fade-up-5" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              Operating Schedule (optional)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Allowed days" hint="Leave all unselected to allow any day">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS.map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        borderRadius: 6,
                        border: '1px solid',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        background: form.scheduleDays.includes(d) ? 'var(--accent-glow)' : 'var(--bg-base)',
                        borderColor: form.scheduleDays.includes(d) ? 'var(--accent-dim)' : 'var(--border)',
                        color: form.scheduleDays.includes(d) ? 'var(--accent)' : 'var(--text-dim)',
                      }}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          {/* Save */}
          <div className="fade-up fade-up-6" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={save}
              disabled={saving || saved}
              style={{
                padding: '10px 24px',
                background: saved ? 'var(--green-glow)' : 'var(--accent)',
                border: `1px solid ${saved ? 'var(--green)' : 'var(--accent)'}`,
                borderRadius: 8,
                color: saved ? 'var(--green)' : '#000',
                fontWeight: 600,
                fontSize: 13,
                cursor: saving ? 'wait' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saved ? '✓ Policy saved' : saving ? 'Saving…' : 'Save policy'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getCookie(name: string): string | null {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? decodeURIComponent(v[2]) : null;
}
