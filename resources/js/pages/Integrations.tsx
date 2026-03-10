import { useState, useEffect, useRef } from 'react';

/* ── Mandate skill file content ──────────────────────────────────────────── */
const MANDATE_SKILL_MD = `---
name: mandate
description: Add Mandate policy enforcement to any supported agent framework or tool
---

## What is Mandate
Non-custodial policy layer for agent wallets. Set spend limits, require approval,
and audit every payment before execution.

## Supported integrations
- OpenClaw: bun add @mandate/openclaw-plugin
- Claude Code: cp mandate-hook.sh ~/.claude/hooks/ (PreToolUse hook)
- MCP / Codex: npx wrangler deploy (Cloudflare Worker)
- ElizaOS: bun add @mandate/eliza-plugin
- Coinbase AgentKit: bun add @mandate/agentkit-provider @coinbase/agentkit
- GOAT SDK: bun add @mandate/goat-plugin @goat-sdk/core
- GAME SDK (Virtuals): bun add @mandate/game-plugin @virtuals-protocol/game
- ACP (Virtuals): bun add @mandate/acp-plugin
- Core (any stack): bun add @mandate/sdk

## Required env var
MANDATE_RUNTIME_KEY — from https://mandate.krutovoy.me/dashboard

## Steps
1. Install the package for your framework
2. Wrap your wallet / tool call with the Mandate client
3. Handle errors: PolicyBlockedError (blocked) and ApprovalRequiredError (pause + escalate)

## Full docs
https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md
`;

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Integration {
  id: string;
  framework: string;
  package: string;
  category: 'core' | 'agent' | 'assistant';
  icon: string;
  tagline: string;
  install: string;
  code: string;
  lang: 'typescript' | 'bash' | 'json' | 'toml';
  envVars: { name: string; note: string }[];
  prerequisites: string[];
  githubUrl: string;
  hasSkill: boolean;
}

type FilterCategory = 'all' | 'agent' | 'assistant' | 'core';

/* ── Integration data ────────────────────────────────────────────────────── */
const INTEGRATIONS: Integration[] = [
  {
    id: 'openclaw',
    framework: 'OpenClaw',
    package: '@mandate/openclaw-plugin',
    category: 'agent',
    icon: '🦀',
    tagline: 'Drop-in policy plugin for OpenClaw agents',
    install: 'bun add @mandate/openclaw-plugin',
    code: `import { MandatePlugin } from '@mandate/openclaw-plugin';
import { OpenClaw } from 'openclaw';

const agent = new OpenClaw({
  plugins: [
    new MandatePlugin({
      runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
      chainId: Number(process.env.MANDATE_CHAIN_ID),
    }),
  ],
});

// Mandate intercepts all wallet calls automatically
await agent.run('Send 10 USDC to alice.eth');`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
      { name: 'MANDATE_CHAIN_ID', note: 'e.g. 84532 for Base Sepolia' },
    ],
    prerequisites: ['local EVM wallet key required'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: true,
  },
  {
    id: 'claude-code',
    framework: 'Claude Code',
    package: 'mandate-hook.sh',
    category: 'assistant',
    icon: '🤖',
    tagline: 'PreToolUse hook for Claude Code sessions',
    install: 'cp mandate-hook.sh ~/.claude/hooks/mandate-hook.sh',
    code: `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__.*__.*pay.*|mcp__.*__.*transfer.*|mcp__.*__.*send.*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/mandate-hook.sh"
          }
        ]
      }
    ]
  }
}`,
    lang: 'json',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
      { name: 'MANDATE_API_URL', note: 'optional, defaults to hosted endpoint' },
    ],
    prerequisites: ['~/.claude/hooks directory'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: true,
  },
  {
    id: 'mcp',
    framework: 'MCP / Codex',
    package: '@mandate/mcp-worker',
    category: 'assistant',
    icon: '⚙️',
    tagline: 'Cloudflare Worker MCP server with policy enforcement',
    install: 'npx wrangler deploy',
    code: `[mcp_servers.mandate]
url = "https://mandate-mcp.YOUR_SUBDOMAIN.workers.dev/mcp"
env = { MANDATE_RUNTIME_KEY = "$MANDATE_RUNTIME_KEY" }

# All payment tools routed through Mandate policy checks
# Add to ~/.codex/mcp.toml or equivalent`,
    lang: 'toml',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
    ],
    prerequisites: ['Cloudflare account required'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: true,
  },
  {
    id: 'eliza',
    framework: 'ElizaOS',
    package: '@mandate/eliza-plugin',
    category: 'agent',
    icon: '🧬',
    tagline: 'Plugin for ElizaOS agent runtimes',
    install: 'bun add @mandate/eliza-plugin',
    code: `import { mandatePlugin } from '@mandate/eliza-plugin';
import { AgentRuntime } from '@elizaos/core';

const runtime = new AgentRuntime({
  plugins: [mandatePlugin],
  settings: {
    MANDATE_RUNTIME_KEY: process.env.MANDATE_RUNTIME_KEY!,
    MANDATE_CHAIN_ID: process.env.MANDATE_CHAIN_ID!,
  },
});

// All on-chain actions are policy-gated automatically`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
      { name: 'MANDATE_CHAIN_ID', note: 'e.g. 84532 for Base Sepolia' },
    ],
    prerequisites: ['local EVM wallet key required'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: false,
  },
  {
    id: 'agentkit',
    framework: 'Coinbase AgentKit',
    package: '@mandate/agentkit-provider',
    category: 'agent',
    icon: '🔵',
    tagline: 'Policy provider for Coinbase AgentKit',
    install: 'bun add @mandate/agentkit-provider @coinbase/agentkit',
    code: `import { MandateWalletProvider } from '@mandate/agentkit-provider';
import { AgentKit } from '@coinbase/agentkit';

const walletProvider = new MandateWalletProvider({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  // Wraps your existing wallet — no custody change
});

const agentKit = new AgentKit({ walletProvider });

// Mandate validates every action before it hits the chain`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
    ],
    prerequisites: ['local EVM wallet key required'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: false,
  },
  {
    id: 'goat',
    framework: 'GOAT SDK',
    package: '@mandate/goat-plugin',
    category: 'agent',
    icon: '🐐',
    tagline: 'Policy middleware for GOAT SDK toolchains',
    install: 'bun add @mandate/goat-plugin @goat-sdk/core',
    code: `import { mandate } from '@mandate/goat-plugin';
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai';

const tools = await getOnChainTools({
  wallet: yourWallet,
  plugins: [
    mandate({
      runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
    }),
  ],
});

// Policy enforced on all GOAT tool calls`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
    ],
    prerequisites: ['local EVM wallet key required'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: false,
  },
  {
    id: 'game',
    framework: 'GAME SDK (Virtuals)',
    package: '@mandate/game-plugin',
    category: 'agent',
    icon: '🎮',
    tagline: 'Policy enforcement for Virtuals GAME agents',
    install: 'bun add @mandate/game-plugin @virtuals-protocol/game',
    code: `import { MandatePlugin } from '@mandate/game-plugin';
import { GameAgent } from '@virtuals-protocol/game';

const agent = new GameAgent(process.env.GAME_API_KEY!, {
  name: 'MyAgent',
  goal: 'Manage DeFi positions safely',
  plugins: [
    new MandatePlugin({
      runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
    }),
  ],
});

await agent.init();`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
    ],
    prerequisites: ['local EVM wallet key required'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: false,
  },
  {
    id: 'acp',
    framework: 'ACP by Virtuals',
    package: '@mandate/acp-plugin',
    category: 'agent',
    icon: '🌐',
    tagline: 'Policy layer for ACP agent-to-agent payments',
    install: 'bun add @mandate/acp-plugin',
    code: `import { withMandate } from '@mandate/acp-plugin';
import { AcpClient } from '@virtuals-protocol/acp';

const acpClient = new AcpClient({
  acpApiKey: process.env.ACP_API_KEY!,
  // Mandate wraps payment methods transparently
});

export const agent = withMandate(acpClient, {
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
});`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
    ],
    prerequisites: ['ACP API key required (AcpConfig.acpApiKey)'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: false,
  },
  {
    id: 'sdk',
    framework: 'Core SDK',
    package: '@mandate/sdk',
    category: 'core',
    icon: '📦',
    tagline: 'Direct HTTP client for any stack or language',
    install: 'bun add @mandate/sdk',
    code: `import { MandateClient, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';

const mandate = new MandateClient({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  chainId: Number(process.env.MANDATE_CHAIN_ID),
});

try {
  const { intentId, allowed } = await mandate.validate({
    to: '0x...',
    value: BigInt('1000000'),
    calldata: '0x...',
  });

  if (allowed) {
    // sign and broadcast locally
  }
} catch (e) {
  if (e instanceof PolicyBlockedError) { /* blocked by policy */ }
  if (e instanceof ApprovalRequiredError) { /* await human approval */ }
}`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
      { name: 'MANDATE_CHAIN_ID', note: 'e.g. 84532 for Base Sepolia' },
    ],
    prerequisites: ['local EVM wallet key required'],
    githubUrl: 'https://github.com/SwiftAdviser/mandate/blob/master/docs/STACK.md',
    hasSkill: false,
  },
];

const FILTER_TABS: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'agent', label: 'Agent Frameworks' },
  { id: 'assistant', label: 'AI Coding Assistants' },
  { id: 'core', label: 'Core SDK' },
];

/* ── Download skill helper ───────────────────────────────────────────────── */
function downloadSkill() {
  const blob = new Blob([MANDATE_SKILL_MD], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mandate.skill.md';
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Copy hook ───────────────────────────────────────────────────────────── */
function useCopy() {
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    if (timers.current[key]) clearTimeout(timers.current[key]);
    setCopied(prev => ({ ...prev, [key]: true }));
    timers.current[key] = setTimeout(() => {
      setCopied(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  return { copy, copied };
}

/* ── Integration card ────────────────────────────────────────────────────── */
function IntegrationCard({
  item,
  active,
  onClick,
}: {
  item: Integration;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-controls="integration-detail"
      style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: '24px', textAlign: 'left', cursor: 'pointer',
        background: active ? 'var(--bg-raised)' : 'var(--bg-surface)',
        border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
        borderRadius: 4,
        boxShadow: active ? '0 0 0 1px var(--amber), 0 0 16px rgba(245,158,11,0.1)' : 'none',
        transition: 'all 0.2s ease',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 15,
            fontWeight: 500, color: 'var(--text-primary)',
            marginBottom: 2,
          }}>{item.framework}</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: active ? 'var(--amber)' : 'var(--text-dim)',
            letterSpacing: '0.02em',
          }}>{item.package}</div>
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 13,
        color: 'var(--text-secondary)', lineHeight: 1.5,
      }}>{item.tagline}</div>
      {item.hasSkill && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--amber)', letterSpacing: '0.06em',
          textTransform: 'uppercase', opacity: 0.8,
        }}>✦ Skill available</div>
      )}
    </button>
  );
}

/* ── Detail panel ────────────────────────────────────────────────────────── */
function DetailPanel({ item }: { item: Integration }) {
  const { copy, copied } = useCopy();

  const langLabel: Record<string, string> = {
    typescript: 'TypeScript',
    bash: 'Shell',
    json: 'JSON',
    toml: 'TOML',
  };

  return (
    <div
      id="integration-detail"
      key={item.id}
      className="fade-up"
      style={{
        marginTop: 24,
        border: '1px solid var(--border)',
        borderRadius: 4,
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '24px 28px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>{item.icon}</span>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 14,
            color: 'var(--amber)',
          }}>{item.package}</div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 16,
            color: 'var(--text-primary)', fontWeight: 500,
          }}>{item.framework}</div>
        </div>
      </div>

      <div style={{ padding: '28px' }}>
        {/* Install block */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-dim)', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 10,
          }}>Install</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-dim)',
            borderRadius: 4, padding: '12px 16px',
          }}>
            <code style={{
              flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'var(--text-primary)',
            }}>{item.install}</code>
            <button
              onClick={() => copy(`${item.id}-install`, item.install)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: copied[`${item.id}-install`] ? 'var(--amber)' : 'var(--text-dim)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 0.15s',
                flexShrink: 0,
              }}
            >
              {copied[`${item.id}-install`] ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Code block */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: '#040709',
            border: '1px solid var(--border)',
            borderRadius: 4, overflow: 'hidden',
          }}>
            <div style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
              padding: '10px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--text-dim)', letterSpacing: '0.04em',
              }}>{langLabel[item.lang] ?? item.lang}</span>
              <button
                onClick={() => copy(`${item.id}-code`, item.code)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: copied[`${item.id}-code`] ? 'var(--amber)' : 'var(--text-dim)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 8px',
                  transition: 'color 0.15s',
                }}
              >
                {copied[`${item.id}-code`] ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{
              margin: 0, padding: '20px 20px',
              fontFamily: 'var(--font-mono)', fontSize: 12.5,
              lineHeight: 1.75, color: 'var(--text-secondary)',
              overflowX: 'auto', whiteSpace: 'pre',
            }}>
              {item.code.split('\n').map((line, i) => {
                const isComment = line.trim().startsWith('//') || line.trim().startsWith('#');
                const isKey = /^(import|export|const|let|var|async|await|try|catch|if|return|new)\b/.test(line.trim());
                const isString = line.includes('"') || line.includes("'") || line.includes('`');
                return (
                  <span key={i} style={{
                    display: 'block',
                    color: isComment ? 'var(--text-dim)'
                         : isKey    ? 'var(--amber)'
                         : isString ? 'var(--text-secondary)'
                         : 'var(--text-primary)',
                  }}>{line}</span>
                );
              })}
            </pre>
          </div>
        </div>

        {/* Env vars */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-dim)', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Environment Variables</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {item.envVars.map(ev => (
              <div key={ev.name} style={{
                display: 'flex', alignItems: 'baseline', gap: 12,
                flexWrap: 'wrap',
              }}>
                <code style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--amber)',
                }}>{ev.name}</code>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--text-dim)',
                }}>· {ev.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        {item.prerequisites.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-dim)', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>Prerequisites</div>
            {item.prerequisites.map(p => (
              <div key={p} style={{
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--text-secondary)',
              }}>· {p}</div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {item.hasSkill && (
            <button
              onClick={downloadSkill}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px',
                background: 'var(--amber-glow)',
                border: '1px solid var(--amber-dim)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--amber)', cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              ↓ mandate.skill.md
            </button>
          )}
          <a
            href={item.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'var(--text-secondary)', textDecoration: 'none',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Full setup guide →
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Integrations() {
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = INTEGRATIONS.filter(i =>
    filter === 'all' || i.category === filter
  );

  const selectedItem = INTEGRATIONS.find(i => i.id === selected) ?? null;

  const handleCardClick = (id: string) => {
    setSelected(prev => (prev === id ? null : id));
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @media (max-width: 900px) {
          .int-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .int-grid { grid-template-columns: 1fr !important; }
          .filter-tabs { flex-wrap: wrap !important; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(8,12,16,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <a href="/" style={{
            display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 20, fontWeight: 400, color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>mandate</span>
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)',
              background: 'var(--amber-glow)', color: 'var(--amber)',
              border: '1px solid var(--amber-dim)',
              borderRadius: 3, padding: '2px 6px',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>beta</span>
          </a>

          <a href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'var(--amber)', color: '#080c10',
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', borderRadius: 4,
            letterSpacing: '-0.01em',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >Launch App →</a>
        </div>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ paddingTop: 120, paddingBottom: 64 }}>
          <div className="fade-up fade-up-1" style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--amber)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 20,
          }}>
            Agent Security Infrastructure
          </div>
          <h1 className="fade-up fade-up-2" style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 'clamp(36px, 4vw, 52px)',
            fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
            margin: '0 0 20px', whiteSpace: 'pre-line',
          }}>
            {`Add policy enforcement\nto your agent framework.`}
          </h1>
          <div className="fade-up fade-up-3" style={{
            fontFamily: 'var(--font-mono)', fontSize: 14,
            color: 'var(--text-dim)', letterSpacing: '0.02em',
          }}>
            Five minutes. No custody changes.
          </div>
        </div>

        {/* Filter tabs */}
        <div className="filter-tabs fade-up" style={{
          display: 'flex', gap: 4, marginBottom: 32,
          borderBottom: '1px solid var(--border-dim)',
        }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilter(tab.id); setSelected(null); }}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: filter === tab.id ? 'var(--amber)' : 'var(--text-dim)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px',
                borderBottom: `2px solid ${filter === tab.id ? 'var(--amber)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card grid */}
        <div
          className="int-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {filtered.map(item => (
            <IntegrationCard
              key={item.id}
              item={item}
              active={selected === item.id}
              onClick={() => handleCardClick(item.id)}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <DetailPanel key={selectedItem.id} item={selectedItem} />
        )}

        {/* Footer spacing */}
        <div style={{ height: 80 }} />
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-dim)', padding: '32px 0' }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 18, fontWeight: 400, color: 'var(--text-dim)', letterSpacing: '-0.02em',
          }}>mandate</span>

          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'Landing', href: '/' },
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Docs', href: '#' },
              { label: 'GitHub', href: '#' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{
                color: 'var(--text-dim)', textDecoration: 'none',
                fontSize: 13, fontFamily: 'var(--font-mono)', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
              >{label}</a>
            ))}
          </div>

          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
            Built for the agentic web
          </span>
        </div>
      </footer>
    </div>
  );
}
