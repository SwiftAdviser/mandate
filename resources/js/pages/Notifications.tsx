import DashboardLayout from '@/layouts/DashboardLayout';
import { FaTelegram, FaSlack } from 'react-icons/fa';
import { useState } from 'react';

interface Webhook {
  type: 'slack' | 'telegram' | 'custom';
  url?: string;
  bot_token?: string;
  chat_id?: string;
  secret?: string;
  username?: string;
}

interface Props {
  agent_id: string;
  agent_name: string;
  webhooks: Webhook[];
  telegram_usernames: string[];
}

function getCookie(name: string): string | null {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? decodeURIComponent(v[2]) : null;
}

export default function Notifications({ agent_id, agent_name, webhooks: initial, telegram_usernames: initialTg }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initial.filter(w => w.type !== 'telegram'));
  const [tgUsernames, setTgUsernames] = useState<string[]>(initialTg);
  const [tgInput, setTgInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState('');

  // Slack webhook helpers
  const slackWebhooks = webhooks.filter(w => w.type === 'slack');

  function addSlack() {
    setWebhooks(w => [...w, { type: 'slack', url: '' }]);
  }

  function removeSlack(idx: number) {
    const slackIdx = webhooks.map((w, i) => w.type === 'slack' ? i : -1).filter(i => i >= 0);
    const realIdx = slackIdx[idx];
    setWebhooks(w => w.filter((_, i) => i !== realIdx));
  }

  function updateSlackUrl(idx: number, url: string) {
    const slackIdx = webhooks.map((w, i) => w.type === 'slack' ? i : -1).filter(i => i >= 0);
    const realIdx = slackIdx[idx];
    setWebhooks(w => w.map((wh, i) => i === realIdx ? { ...wh, url } : wh));
  }

  // Telegram username helpers
  function addTgUsername() {
    const u = tgInput.trim().replace(/^@/, '');
    if (u && !tgUsernames.includes(u)) {
      setTgUsernames(prev => [...prev, u]);
    }
    setTgInput('');
  }

  function removeTgUsername(u: string) {
    setTgUsernames(prev => prev.filter(x => x !== u));
  }

  // Build webhook array for save (merge slack + telegram usernames)
  function buildWebhooksPayload(): Webhook[] {
    const result: Webhook[] = [...webhooks.filter(w => w.type === 'slack')];
    for (const username of tgUsernames) {
      result.push({ type: 'telegram', username, chat_id: '', bot_token: '' });
    }
    return result;
  }

  async function save() {
    if (!agent_id) { setError('No agent found.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/agents/${agent_id}/webhooks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
        body: JSON.stringify({ webhooks: buildWebhooksPayload() }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.message ?? 'Failed'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  async function sendTest() {
    if (!agent_id) return;
    setTesting(true);
    setError('');
    try {
      const res = await fetch(`/api/agents/${agent_id}/webhooks/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.error ?? 'Test failed'); return; }
      setTested(true);
      setTimeout(() => setTested(false), 3000);
    } finally { setTesting(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)',
    fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
    boxSizing: 'border-box',
  };

  const hasChannels = slackWebhooks.length > 0 || tgUsernames.length > 0;

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 760 }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Get notified when an intent requires human approval.
            {agent_name && <> Configuring for <strong style={{ color: 'var(--text-secondary)' }}>{agent_name}</strong>.</>}
          </p>
        </div>

        {!agent_id ? (
          <div className="fade-up fade-up-1" style={{
            padding: '40px', textAlign: 'center',
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⊘</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No agent found</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Create an agent first.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Telegram */}
            <div className="fade-up fade-up-1" style={{
              padding: '20px 24px',
              background: 'var(--bg-surface)',
              border: `1px solid ${tgUsernames.length > 0 ? 'rgba(41,182,246,0.3)' : 'var(--border)'}`,
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <FaTelegram size={20} color="#29b6f6" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Telegram</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    via{' '}
                    <a href="https://t.me/mandatemd_bot" target="_blank" rel="noopener noreferrer" style={{ color: '#29b6f6', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                      @mandatemd_bot
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 12 }}>
                Add Telegram usernames who should receive approval notifications.
                Each person must{' '}
                <a href="https://t.me/mandatemd_bot" target="_blank" rel="noopener noreferrer" style={{ color: '#29b6f6', textDecoration: 'none' }}>
                  open @mandatemd_bot
                </a>{' '}
                and tap <strong style={{ color: 'var(--text-secondary)' }}>Start</strong> once.
              </div>

              {/* Username chips */}
              {tgUsernames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {tgUsernames.map(u => (
                    <span key={u} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px',
                      background: '#29b6f61a',
                      border: '1px solid #29b6f633',
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: '#29b6f6',
                    }}>
                      @{u}
                      <button
                        onClick={() => removeTgUsername(u)}
                        style={{ background: 'none', border: 'none', color: '#29b6f6', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add input */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={tgInput}
                  onChange={e => setTgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTgUsername()}
                  placeholder="@username"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={addTgUsername}
                  style={{
                    padding: '9px 16px', fontSize: 12,
                    background: '#29b6f6', border: 'none',
                    borderRadius: 8, color: '#fff', fontWeight: 500,
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Slack */}
            <div className="fade-up fade-up-2" style={{
              padding: '20px 24px',
              background: 'var(--bg-surface)',
              border: `1px solid ${slackWebhooks.length > 0 ? 'rgba(74,158,255,0.3)' : 'var(--border)'}`,
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <FaSlack size={20} color="#E01E5A" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Slack</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Incoming Webhook URL</div>
                </div>
              </div>

              <details style={{ marginBottom: 12 }}>
                <summary style={{ fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                  How to get a webhook URL
                </summary>
                <ol style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--text-dim)', fontSize: 11, lineHeight: 1.8 }}>
                  <li><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>api.slack.com/apps</span> → Create New App</li>
                  <li>Incoming Webhooks → Activate → Add New Webhook</li>
                  <li>Pick a channel → Copy URL → Paste below</li>
                </ol>
              </details>

              {slackWebhooks.map((wh, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input
                    value={wh.url ?? ''}
                    onChange={e => updateSlackUrl(idx, e.target.value)}
                    placeholder="https://hooks.slack.com/services/T.../B.../..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={() => removeSlack(idx)} style={{
                    background: 'none', border: 'none', color: 'var(--red)',
                    cursor: 'pointer', fontSize: 14, padding: '4px 8px', flexShrink: 0,
                  }}>×</button>
                </div>
              ))}

              <button onClick={addSlack} style={{
                padding: '7px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
                + Add Slack channel
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 16px', background: 'var(--red-glow)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                color: 'var(--red)', fontSize: 12,
              }}>{error}</div>
            )}

            {/* Actions */}
            <div className="fade-up fade-up-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={sendTest}
                disabled={testing || !hasChannels}
                style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: tested ? 'var(--green)' : 'var(--text-secondary)',
                  fontSize: 13, cursor: testing || !hasChannels ? 'not-allowed' : 'pointer',
                  opacity: !hasChannels ? 0.4 : 1,
                }}
              >
                {tested ? '✓ Test sent' : testing ? 'Sending...' : 'Send test'}
              </button>
              <button
                onClick={save}
                disabled={saving || saved}
                style={{
                  padding: '10px 24px',
                  background: saved ? 'var(--green-glow)' : 'var(--accent)',
                  border: `1px solid ${saved ? 'var(--green)' : 'var(--accent)'}`,
                  borderRadius: 8, color: saved ? 'var(--green)' : '#000',
                  fontWeight: 600, fontSize: 13,
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
