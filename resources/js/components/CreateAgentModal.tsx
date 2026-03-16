import { FormEvent, useState } from 'react';
import RuntimeKeyReveal from './RuntimeKeyReveal';

interface Props {
  onClose: () => void;
}

const CHAINS = [
  { id: 84532, label: 'Base Sepolia (84532)' },
  { id: 8453, label: 'Base (8453)' },
];

export default function CreateAgentModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [evmAddress, setEvmAddress] = useState('');
  const [chainId, setChainId] = useState(84532);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [runtimeKey, setRuntimeKey] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(
            document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
          ),
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ name, evmAddress, chainId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setRuntimeKey(data.runtimeKey);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    window.location.reload();
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: 6,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '90vw',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '28px 28px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {runtimeKey ? (
          <RuntimeKeyReveal runtimeKey={runtimeKey} onDone={handleDone} />
        ) : (
          <>
            <div style={{
              fontSize: 18,
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              marginBottom: 20,
            }}>
              Create Agent
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="my-trading-agent"
                  required
                  maxLength={100}
                  style={inputStyle}
                />
              </div>

              {/* EVM Address */}
              <div>
                <label style={labelStyle}>EVM Address</label>
                <input
                  type="text"
                  value={evmAddress}
                  onChange={e => setEvmAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  pattern="^0x[a-fA-F0-9]{40}$"
                  style={inputStyle}
                />
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  The agent's wallet address (0x + 40 hex chars)
                </div>
              </div>

              {/* Chain */}
              <div>
                <label style={labelStyle}>Chain</label>
                <select
                  value={chainId}
                  onChange={e => setChainId(Number(e.target.value))}
                  style={{
                    ...inputStyle,
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--red, #ef4444)',
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 6,
                }}>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 18px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--amber)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#000',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-display)',
                    cursor: loading ? 'wait' : 'pointer',
                    letterSpacing: '-0.02em',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
