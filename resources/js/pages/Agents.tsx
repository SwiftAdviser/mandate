import ChainBadge from '@/components/ChainBadge';
import DashboardLayout from '@/layouts/DashboardLayout';
import { shortAddr, timeAgo } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface ApiKey {
  id: string;
  key_prefix: string;
  is_test: boolean;
}

interface Agent {
  id: string;
  name: string;
  wallet_address: string | null;
  chain_id: string | null;
  created_at: string;
  active_api_key: ApiKey | null;
}

interface Props {
  agents: Agent[];
}

export default function Agents({ agents }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newKey, setNewKey] = useState<{ agentId: string; key: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startRename(agent: Agent) {
    setEditingId(agent.id);
    setEditName(agent.name);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function saveRename(agentId: string) {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        router.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  async function regenerateKey(agentId: string) {
    setConfirmRegen(null);
    const res = await fetch(`/api/agents/${agentId}/regenerate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') },
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey({ agentId, key: data.runtimeKey });
      router.reload();
    }
  }

  async function deleteAgent(agentId: string) {
    setConfirmDelete(null);
    const res = await fetch(`/api/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') },
    });
    if (res.ok) {
      router.reload();
    }
  }

  const thStyle = {
    padding: '11px 16px', textAlign: 'left' as const, color: 'var(--text-dim)',
    fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const,
  };

  const tdStyle = { padding: '12px 16px', fontSize: 12, fontFamily: 'var(--font-mono)' };

  const btnStyle = {
    padding: '4px 10px', fontSize: 11, background: 'var(--bg-raised)',
    border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
  } as const;

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px' }}>
        <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>Agents</h1>
            <p style={{ marginTop: 6, color: 'var(--text-dim)', fontSize: 13 }}>Manage your connected agents, keys, and access.</p>
          </div>
        </div>

        {/* New key reveal */}
        {newKey && (
          <div className="fade-up" style={{
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>New runtime key generated</div>
              <code style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{newKey.key}</code>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Copy it now. It won't be shown again.</div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(newKey.key); setNewKey(null); }} style={{ ...btnStyle, background: 'var(--green)', color: '#000', border: 'none', padding: '6px 14px' }}>
              Copy & dismiss
            </button>
          </div>
        )}

        {/* Table */}
        <div className="fade-up fade-up-1" style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-raised)' }}>
                {['Name', 'Address', 'Chain', 'Key', 'Created', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr
                  key={agent.id}
                  style={{ borderBottom: i < agents.length - 1 ? '1px solid var(--border-dim)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Name */}
                  <td style={{ ...tdStyle, minWidth: 160 }}>
                    {editingId === agent.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          ref={inputRef}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveRename(agent.id); if (e.key === 'Escape') setEditingId(null); }}
                          style={{
                            padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-mono)',
                            background: 'var(--bg-raised)', border: '1px solid var(--border)',
                            borderRadius: 6, color: 'var(--text-primary)', outline: 'none', width: 140,
                          }}
                        />
                        <button onClick={() => saveRename(agent.id)} disabled={saving} style={{ ...btnStyle, padding: '4px 8px', fontSize: 10 }}>
                          {saving ? '...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => startRename(agent)}
                        style={{ color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px dashed var(--border)' }}
                        title="Click to rename"
                      >
                        {agent.name}
                      </span>
                    )}
                  </td>

                  {/* Address */}
                  <td style={{ ...tdStyle, color: agent.wallet_address ? 'var(--text-secondary)' : 'var(--text-dim)' }}>
                    {agent.wallet_address ? shortAddr(agent.wallet_address) : 'not activated'}
                  </td>

                  {/* Chain */}
                  <td style={{ ...tdStyle }}>
                    {agent.chain_id ? <ChainBadge chainId={agent.chain_id} /> : <span style={{ color: 'var(--text-dim)' }}>-</span>}
                  </td>

                  {/* Key prefix */}
                  <td style={{ ...tdStyle, color: 'var(--text-dim)', fontSize: 11 }}>
                    {agent.active_api_key ? (
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10,
                        background: agent.active_api_key.is_test ? 'rgba(245,158,11,0.12)' : 'rgba(52,211,153,0.12)',
                        color: agent.active_api_key.is_test ? '#f59e0b' : 'var(--green)',
                        border: `1px solid ${agent.active_api_key.is_test ? 'rgba(245,158,11,0.25)' : 'rgba(52,211,153,0.25)'}`,
                      }}>
                        {agent.active_api_key.key_prefix}...
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>no key</span>
                    )}
                  </td>

                  {/* Created */}
                  <td style={{ ...tdStyle, color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {timeAgo(agent.created_at)}
                  </td>

                  {/* Actions */}
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {confirmRegen === agent.id ? (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>Regenerate key?</span>
                          <button onClick={() => regenerateKey(agent.id)} style={{ ...btnStyle, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}>Yes</button>
                          <button onClick={() => setConfirmRegen(null)} style={btnStyle}>No</button>
                        </>
                      ) : confirmDelete === agent.id ? (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>Delete agent?</span>
                          <button onClick={() => deleteAgent(agent.id)} style={{ ...btnStyle, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.4)' }}>Yes</button>
                          <button onClick={() => setConfirmDelete(null)} style={btnStyle}>No</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startRename(agent)} style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={12} /> Rename</button>
                          <button onClick={() => setConfirmRegen(agent.id)} style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={12} /> Regen key</button>
                          <button onClick={() => setConfirmDelete(agent.id)} style={{ ...btnStyle, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={12} /> Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                    No agents yet. Create one from the dashboard or register via API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}
