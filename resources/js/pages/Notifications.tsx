import DashboardLayout from '@/layouts/DashboardLayout';
import { useState } from 'react';

interface Webhook {
  type: 'slack' | 'telegram' | 'custom';
  url?: string;
  bot_token?: string;
  chat_id?: string;
  secret?: string;
}

interface Props {
  agent_id: string;
  agent_name: string;
  webhooks: Webhook[];
}

function getCookie(name: string): string | null {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? decodeURIComponent(v[2]) : null;
}

export default function Notifications({ agent_id, agent_name, webhooks: initial }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState('');

  function addWebhook(type: Webhook['type']) {
    if (type === 'slack') {
      setWebhooks(w => [...w, { type: 'slack', url: '' }]);
    } else if (type === 'telegram') {
      setWebhooks(w => [...w, { type: 'telegram', bot_token: '', chat_id: '' }]);
    } else {
      setWebhooks(w => [...w, { type: 'custom', url: '', secret: '' }]);
    }
  }

  function removeWebhook(index: number) {
    setWebhooks(w => w.filter((_, i) => i !== index));
  }

  function updateWebhook(index: number, field: string, value: string) {
    setWebhooks(w => w.map((wh, i) => i === index ? { ...wh, [field]: value } : wh));
  }

  async function save() {
    if (!agent_id) { setError('No agent found. Create an agent first.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/agents/${agent_id}/webhooks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
        body: JSON.stringify({ webhooks }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'Failed to save');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Test failed');
        return;
      }
      setTested(true);
      setTimeout(() => setTested(false), 3000);
    } finally {
      setTesting(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontSize: 11,
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)',
    marginBottom: 4,
    display: 'block' as const,
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 760 }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Get notified on Slack or Telegram when an intent requires human approval.
            {agent_name && <> Configuring for <strong style={{ color: 'var(--text-secondary)' }}>{agent_name}</strong>.</>}
          </p>
        </div>

        {!agent_id && (
          <div className="fade-up fade-up-1" style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⊘</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No agent found</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
              Create an agent first, then come back to configure notifications.
            </div>
          </div>
        )}

        {agent_id && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Setup guides */}
            <div className="fade-up fade-up-1" style={{ padding: '20px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                How to set up
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ padding: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-dim)', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>#</span> Slack
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--text-dim)', fontSize: 11, lineHeight: 1.8 }}>
                    <li>Go to <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>api.slack.com/apps</span></li>
                    <li>Create app {">"} Incoming Webhooks {">"} On</li>
                    <li>Add New Webhook to Workspace</li>
                    <li>Copy the webhook URL and paste below</li>
                  </ol>
                </div>
                <div style={{ padding: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-dim)', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✈</span> Telegram
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--text-dim)', fontSize: 11, lineHeight: 1.8 }}>
                    <li>Message <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>@BotFather</span> on Telegram</li>
                    <li><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>/newbot</span> {">"} follow prompts {">"} get bot token</li>
                    <li>Add the bot to your group/channel</li>
                    <li>Get Chat ID (send a message, check <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>api.telegram.org/bot{"<token>"}/getUpdates</span>)</li>
                    <li>Enter bot token + chat ID below</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Configured webhooks */}
            <div className="fade-up fade-up-2" style={{ padding: '20px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Channels ({webhooks.length})
              </div>

              {webhooks.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border-dim)' }}>
                  No notification channels configured. Add one below.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {webhooks.map((wh, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 8,
                    position: 'relative',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: wh.type === 'slack' ? '#4a9eff' : wh.type === 'telegram' ? '#29b6f6' : 'var(--text-secondary)',
                        background: wh.type === 'slack' ? '#4a9eff1a' : wh.type === 'telegram' ? '#29b6f61a' : 'var(--bg-raised)',
                        padding: '3px 8px', borderRadius: 4,
                        border: `1px solid ${wh.type === 'slack' ? '#4a9eff33' : wh.type === 'telegram' ? '#29b6f633' : 'var(--border)'}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        {wh.type}
                      </span>
                      <button onClick={() => removeWebhook(i)} style={{
                        background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11,
                        fontFamily: 'var(--font-mono)', padding: '2px 6px',
                      }}>
                        remove
                      </button>
                    </div>

                    {wh.type === 'slack' && (
                      <div>
                        <label style={labelStyle}>Webhook URL</label>
                        <input
                          value={wh.url ?? ''}
                          onChange={e => updateWebhook(i, 'url', e.target.value)}
                          placeholder="https://hooks.slack.com/services/T.../B.../..."
                          style={inputStyle}
                        />
                      </div>
                    )}

                    {wh.type === 'telegram' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Bot Token</label>
                          <input
                            value={wh.bot_token ?? ''}
                            onChange={e => updateWebhook(i, 'bot_token', e.target.value)}
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Chat ID</label>
                          <input
                            value={wh.chat_id ?? ''}
                            onChange={e => updateWebhook(i, 'chat_id', e.target.value)}
                            placeholder="-1001234567890"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    )}

                    {wh.type === 'custom' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Webhook URL</label>
                          <input
                            value={wh.url ?? ''}
                            onChange={e => updateWebhook(i, 'url', e.target.value)}
                            placeholder="https://your-server.com/webhook"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>HMAC Secret (optional)</label>
                          <input
                            value={wh.secret ?? ''}
                            onChange={e => updateWebhook(i, 'secret', e.target.value)}
                            placeholder="your-hmac-secret"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {(['slack', 'telegram', 'custom'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => addWebhook(type)}
                    style={{
                      padding: '7px 14px',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    + {type}
                  </button>
                ))}
              </div>
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

            {/* Actions */}
            <div className="fade-up fade-up-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={sendTest}
                disabled={testing || webhooks.length === 0}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: tested ? 'var(--green)' : 'var(--text-secondary)',
                  fontSize: 13,
                  cursor: testing || webhooks.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: webhooks.length === 0 ? 0.4 : 1,
                }}
              >
                {tested ? '✓ Test sent' : testing ? 'Sending...' : 'Send test'}
              </button>
              <button
                onClick={save}
                disabled={saving || saved}
                style={{
                  padding: '10px 24px',
                  background: saved ? 'var(--green-glow)' : 'var(--amber)',
                  border: `1px solid ${saved ? 'var(--green)' : 'var(--amber)'}`,
                  borderRadius: 8,
                  color: saved ? 'var(--green)' : '#000',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: saving ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* What you'll receive */}
            <div className="fade-up fade-up-4" style={{ padding: '20px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                What you'll receive
              </div>
              <div style={{
                padding: '16px 20px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-dim)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
              }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: 6 }}>Approval Required</div>
                <div><span style={{ color: 'var(--text-dim)' }}>Agent:</span> {agent_name || 'your-agent'}</div>
                <div><span style={{ color: 'var(--text-dim)' }}>To:</span> 0xBob...ef12 ($400 USDC)</div>
                <div style={{ marginTop: 6, borderLeft: '3px solid var(--amber-dim)', paddingLeft: 10, fontStyle: 'italic', color: 'var(--text-primary)' }}>
                  WHY: "New vendor onboarding. First payment for API integration. Contract signed 2026-03-15."
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Guard:</span>{' '}
                  <span style={{ color: 'var(--amber)' }}>"new vendor" rule matched</span>
                </div>
                <div><span style={{ color: 'var(--text-dim)' }}>Risk:</span> <span style={{ color: 'var(--green)' }}>LOW</span></div>
                <div style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 11 }}>
                  [Review in Dashboard]
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
