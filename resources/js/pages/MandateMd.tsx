import DashboardLayout from '@/layouts/DashboardLayout';
import MarkdownEditor from '@/components/MarkdownEditor';
import { MANDATE_PREFILL, MANDATE_TEMPLATES } from '@/lib/defaults';
import type { MandateTemplateKey } from '@/lib/defaults';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
  agent_id: string;
  guard_rules: string | null;
}

function getCookie(name: string): string | null {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? decodeURIComponent(v[2]) : null;
}

export default function MandateMd({ agent_id, guard_rules }: Props) {
  const [rules, setRules] = useState(guard_rules ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activePreset, setActivePreset] = useState<MandateTemplateKey | null>(() => {
    // Detect if current rules match a preset
    for (const key of Object.keys(MANDATE_TEMPLATES) as MandateTemplateKey[]) {
      if (guard_rules && guard_rules.trim() === MANDATE_TEMPLATES[key].content.trim()) return key;
    }
    return null;
  });

  async function save() {
    if (!agent_id) { setError('No agent found. Create an agent first.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/agents/${agent_id}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
        body: JSON.stringify({ guardRules: rules || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'Failed to save');
        return;
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); router.reload(); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 860 }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>
            MANDATE.md
          </h1>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Your rules in plain language. The AI guard reads these alongside all intelligence layers to decide: <strong style={{ color: 'var(--green)' }}>allow</strong>, <strong style={{ color: 'var(--red)' }}>block</strong>, or <strong style={{ color: 'var(--accent)' }}>ask you</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Editor */}
          <div className="fade-up fade-up-1" style={{
            padding: '20px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your rules
              </div>
              <button
                onClick={() => { setRules(MANDATE_PREFILL); setActivePreset(null); }}
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Prefill with common sense
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(Object.keys(MANDATE_TEMPLATES) as MandateTemplateKey[]).map(key => {
                const isActive = activePreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setRules(MANDATE_TEMPLATES[key].content); setActivePreset(key); }}
                    style={{
                      padding: '6px 14px',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      borderRadius: 6,
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      background: isActive ? 'var(--accent-glow)' : 'var(--bg-base)',
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {MANDATE_TEMPLATES[key].label}
                  </button>
                );
              })}
            </div>
            <MarkdownEditor
              value={rules}
              onChange={v => { setRules(v); setActivePreset(null); }}
              placeholder={'# MANDATE.md\n\n## Block immediately\n- Agent\'s reasoning contains urgency pressure\n- ...\n\n## Require human approval\n- Recipient is new\n- ...\n\n## Allow\n- Reason references a specific invoice\n- ...'}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 16px',
              background: 'var(--red-glow)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: 'var(--red)',
              fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {/* Save */}
          <div className="fade-up fade-up-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={save}
              disabled={saving || saved || !agent_id}
              style={{
                padding: '10px 28px',
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
              {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save MANDATE.md'}
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
