import DashboardLayout from '@/layouts/DashboardLayout';
import { FaTelegram, FaSlack, FaDiscord } from 'react-icons/fa';
import { useState, useRef } from 'react';

interface Webhook {
  type: 'slack' | 'telegram' | 'custom';
  url?: string;
  bot_token?: string;
  chat_id?: string;
  secret?: string;
  username?: string;
}

interface TelegramLink {
  chat_id: string | null;
  username: string | null;
}

interface Props {
  agent_id: string;
  agent_name: string;
  webhooks: Webhook[];
  telegram_links: TelegramLink[];
}

function getCookie(name: string): string | null {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? decodeURIComponent(v[2]) : null;
}

export default function Notifications({ agent_id, agent_name, telegram_links: initialTg }: Props) {
  const [tgLinks, setTgLinks] = useState<TelegramLink[]>(initialTg);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState('');

  // Code-based linking
  const [linkCode, setLinkCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Code-based Telegram linking
  function handleCodeInput(value: string) {
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    setLinkCode(clean);
    setLinkError('');
    setLinkSuccess(false);
    if (clean.length === 8) {
      verifyCode(clean);
    }
  }

  async function verifyCode(code: string) {
    setVerifying(true);
    setLinkError('');
    try {
      const res = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '',
        },
        body: JSON.stringify({ code, agent_id }),
      });
      if (res.ok) {
        setLinkSuccess(true);
        setTgLinks(prev => [...prev, { chat_id: code, username: null }]);
        setLinkCode('');
        setTimeout(() => setLinkSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setLinkError(data.error ?? 'Verification failed.');
      }
    } finally {
      setVerifying(false);
    }
  }

  function removeTgLink(idx: number) {
    setTgLinks(prev => prev.filter((_, i) => i !== idx));
  }

  // Build webhook array for save
  function buildWebhooksPayload(): Webhook[] {
    const result: Webhook[] = [];
    for (const link of tgLinks) {
      result.push({
        type: 'telegram',
        chat_id: link.chat_id ?? '',
        username: link.username ?? '',
      });
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

  const hasChannels = tgLinks.length > 0;

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
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No agent found</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Create an agent first.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Telegram */}
            <div className="fade-up fade-up-1" style={{
              padding: '20px 24px',
              background: 'var(--bg-surface)',
              border: `1px solid ${tgLinks.length > 0 ? 'rgba(41,182,246,0.3)' : 'var(--border)'}`,
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

              {/* Linked accounts */}
              {tgLinks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {tgLinks.map((link, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#29b6f60a',
                      border: '1px solid #29b6f622',
                      borderRadius: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#29b6f6', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#29b6f6' }}>
                          {link.username ? `@${link.username}` : `chat:${link.chat_id?.slice(0, 8)}`}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>linked</span>
                      </div>
                      <button
                        onClick={() => removeTgLink(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Link flow */}
              <div style={{
                padding: '14px 16px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-dim)',
                borderRadius: 8,
                marginBottom: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#29b6f6', fontWeight: 600 }}>1.</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Open{' '}
                      <a href="https://t.me/mandatemd_bot" target="_blank" rel="noopener noreferrer" style={{ color: '#29b6f6', textDecoration: 'none', fontWeight: 500 }}>
                        @mandatemd_bot
                      </a>{' '}
                      and press <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>/start</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#29b6f6', fontWeight: 600 }}>2.</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paste the 8-character code below:</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={codeInputRef}
                  type="text"
                  value={linkCode}
                  onChange={e => handleCodeInput(e.target.value)}
                  placeholder="ABCD1234"
                  maxLength={8}
                  disabled={verifying}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 14,
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                  }}
                />
              </div>

              {verifying && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>Verifying...</div>
              )}
              {linkError && (
                <div style={{ fontSize: 11, color: 'var(--red, #ef4444)', marginTop: 6 }}>{linkError}</div>
              )}
              {linkSuccess && (
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>Telegram linked successfully.</div>
              )}
            </div>

            {/* Slack — coming soon */}
            <div className="fade-up fade-up-2" style={{
              padding: '20px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              opacity: 0.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaSlack size={20} color="#E01E5A" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Slack</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Incoming Webhook notifications</div>
                </div>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                  padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  coming soon
                </span>
              </div>
            </div>

            {/* Discord — coming soon */}
            <div className="fade-up fade-up-3" style={{
              padding: '20px 24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              opacity: 0.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaDiscord size={20} color="#5865F2" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Discord</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Bot notifications to your server</div>
                </div>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                  padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  coming soon
                </span>
              </div>
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
            <div className="fade-up fade-up-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
                {tested ? 'Test sent' : testing ? 'Sending...' : 'Send test'}
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
                {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
