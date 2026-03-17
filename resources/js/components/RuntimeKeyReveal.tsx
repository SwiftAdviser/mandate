import { useState } from 'react';

interface Props {
  runtimeKey: string;
  onDone: () => void;
}

export default function RuntimeKeyReveal({ runtimeKey, onDone }: Props) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copyKey() {
    await navigator.clipboard.writeText(runtimeKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        fontSize: 13,
        color: 'var(--accent)',
        fontWeight: 500,
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.02em',
      }}>
        Agent created
      </div>

      {/* Key display */}
      <div style={{
        position: 'relative',
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-primary)',
        wordBreak: 'break-all',
        lineHeight: 1.6,
      }}>
        {runtimeKey}
        <button
          onClick={copyKey}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '4px 10px',
            color: copied ? 'var(--green)' : 'var(--text-dim)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>

      {/* Warning */}
      <div style={{
        fontSize: 12,
        color: 'var(--red, #ef4444)',
        fontWeight: 500,
        lineHeight: 1.5,
      }}>
        Save this key now. It will not be shown again.
      </div>

      {/* Checkbox */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontSize: 12,
        color: 'var(--text-secondary)',
      }}>
        <input
          type="checkbox"
          checked={saved}
          onChange={e => setSaved(e.target.checked)}
          style={{ accentColor: 'var(--accent)' }}
        />
        I saved this key
      </label>

      {/* Done button */}
      {saved && (
        <button
          onClick={onDone}
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 8,
            color: '#000',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            letterSpacing: '-0.02em',
          }}
        >
          Done
        </button>
      )}
    </div>
  );
}
