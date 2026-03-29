import DashboardLayout from '@/layouts/DashboardLayout';
import { useState, useEffect, useRef } from 'react';

/* ── Mandate skill file content ──────────────────────────────────────────── */

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Integration {
  id: string;
  framework: string;
  package: string;
  category: 'core' | 'agent' | 'assistant';
  icon: string;
  logo?: string;
  tagline: string;
  install: string;
  quickStart: string; // one-line copy-paste instruction for agents
  code: string;
  lang: 'typescript' | 'bash' | 'json' | 'toml';
  envVars: { name: string; note: string }[];
  prerequisites: string[];
  comingSoon?: boolean;
}

type FilterCategory = 'all' | 'agent' | 'assistant' | 'core';

/* ── Integration data ────────────────────────────────────────────────────── */
const INTEGRATIONS: Integration[] = [
  {
    id: 'openclaw',
    framework: 'OpenClaw',
    package: '@mandate.md/mandate-openclaw-plugin',
    category: 'agent',
    icon: '🦀',
    logo: '/logos/openclaw.svg',
    tagline: 'Policy gatekeeper with hooks. Intercepts financial tool calls automatically.',
    install: 'openclaw plugins install @mandate.md/mandate-openclaw-plugin',
    quickStart: 'openclaw plugins install @mandate.md/mandate-openclaw-plugin',
    code: `# Install the plugin
openclaw plugins install @mandate.md/mandate-openclaw-plugin

# The plugin auto-registers 3 tools:
#   mandate_register  - get runtimeKey (once)
#   mandate_validate  - policy check before every tx
#   mandate_status    - check intent status

# Plus a safety-net hook that intercepts
# Locus/Bankr/Sponge calls automatically.

# Flow:
# 1. Agent calls mandate_register -> gets runtimeKey
# 2. Before any tx: mandate_validate -> allowed/blocked
# 3. If allowed: proceed with normal wallet (Locus, etc.)`,
    lang: 'bash',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },

    ],
    prerequisites: ['local EVM wallet key required'],
  },
  {
    id: 'claude-code',
    comingSoon: true,
    framework: 'Claude Code',
    package: 'claude-mandate-plugin',
    category: 'assistant',
    icon: '🤖',
    logo: '/logos/claude.svg',
    tagline: 'Plugin with stateful two-phase enforcement gate',
    install: 'claude --plugin-dir ./claude-mandate-plugin',
    quickStart: 'claude --plugin-dir ./claude-mandate-plugin',
    code: `// Plugin auto-blocks transaction tools until you validate with Mandate.
// 1. PostToolUse watches for mandate validate calls
// 2. PreToolUse intercepts wallet tools, checks for valid token
// 3. No token = DENY with instructions

// Flow:
mandate validate --action "swap" --reason "Swap ETH for USDC"
bankr prompt "Swap 0.1 ETH for USDC"  // now allowed`,
    lang: 'bash',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
    ],
    prerequisites: ['Claude Code CLI'],
  },
  {
    id: 'mcp',
    framework: 'MCP Server',
    package: 'mcp.mandate.md/mcp',
    category: 'core',
    icon: '⚙️',
    logo: '/logos/mcp.svg',
    tagline: 'Connect any MCP client (Claude, Cursor, Codex) to Mandate policy tools.',
    install: 'https://mcp.mandate.md/mcp',
    quickStart: 'Add https://mcp.mandate.md/mcp to your MCP client config',
    code: `// Claude Desktop: ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "mandate": {
      "url": "https://mcp.mandate.md/mcp"
    }
  }
}

// Codex / other MCP clients: add the URL to your config.
// Tools available:
//   search   - look up API schemas, policy fields, x402 docs
//   execute  - call validate, preflight, register, status
//   x402_info - get x402 pricing and payment flow

// JSON-RPC over HTTP POST. No auth needed for search/x402_info.
// Execute with validate/preflight accepts x402 pay-per-call.`,
    lang: 'json',
    envVars: [],
    prerequisites: [],
  },
  {
    id: 'x402',
    framework: 'x402 Pay-Per-Call',
    package: 'x402 protocol',
    category: 'core',
    icon: '💳',
    tagline: 'Pay $0.10/validation with USDC on Base. No registration needed.',
    install: 'bun add @x402/fetch @x402/evm',
    quickStart: 'bun add @x402/fetch @x402/evm',
    code: `import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

// 1. Set up x402 client with your wallet
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const client = new x402Client();
registerExactEvmScheme(client, { signer: account });
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// 2. Call validate - auto-pays $0.10 USDC on Base
const res = await fetchWithPay('https://app.mandate.md/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'transfer',
    amount: '10',
    to: '0xRecipient...',
    token: 'USDC',
    reason: 'Pay invoice #42',
  }),
});

const { allowed, payer } = await res.json();
// No API key, no registration. Just pay and use.`,
    lang: 'typescript',
    envVars: [
      { name: 'PRIVATE_KEY', note: 'EVM wallet with USDC on Base' },
    ],
    prerequisites: ['USDC on Base mainnet for payments'],
  },
  {
    id: 'eliza',
    comingSoon: true,
    framework: 'ElizaOS',
    package: '@mandate/eliza-plugin',
    category: 'agent',
    icon: '🧬',
    tagline: 'Plugin for ElizaOS agent runtimes',
    install: 'bun add @mandate/eliza-plugin',
    quickStart: 'bun add @mandate/eliza-plugin',
    code: `import { mandatePlugin } from '@mandate/eliza-plugin';
import { AgentRuntime } from '@elizaos/core';

const runtime = new AgentRuntime({
  plugins: [mandatePlugin],
  settings: {
    MANDATE_RUNTIME_KEY: process.env.MANDATE_RUNTIME_KEY!,
  },
});

// All on-chain actions are policy-gated automatically`,
    lang: 'typescript',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },

    ],
    prerequisites: ['local EVM wallet key required'],
  },
  {
    id: 'agentkit',
    comingSoon: true,
    framework: 'Coinbase AgentKit',
    package: '@mandate/agentkit-provider',
    category: 'agent',
    icon: '🔵',
    logo: '/logos/coinbase.svg',
    tagline: 'Policy provider for Coinbase AgentKit',
    install: 'bun add @mandate/agentkit-provider @coinbase/agentkit',
    quickStart: 'bun add @mandate/agentkit-provider',
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
  },
  {
    id: 'goat',
    comingSoon: true,
    framework: 'GOAT SDK',
    package: '@mandate/goat-plugin',
    category: 'agent',
    icon: '🐐',
    tagline: 'Policy middleware for GOAT SDK toolchains',
    install: 'bun add @mandate/goat-plugin @goat-sdk/core',
    quickStart: 'bun add @mandate/goat-plugin',
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
  },
  {
    id: 'game',
    comingSoon: true,
    framework: 'GAME SDK (Virtuals)',
    package: '@mandate/game-plugin',
    category: 'agent',
    icon: '🎮',
    tagline: 'Policy enforcement for Virtuals GAME agents',
    install: 'bun add @mandate/game-plugin @virtuals-protocol/game',
    quickStart: 'bun add @mandate/game-plugin',
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
  },
  {
    id: 'acp',
    comingSoon: true,
    framework: 'ACP by Virtuals',
    package: '@mandate/acp-plugin',
    category: 'agent',
    icon: '🌐',
    tagline: 'Policy layer for ACP agent-to-agent payments',
    install: 'bun add @mandate/acp-plugin',
    quickStart: 'bun add @mandate/acp-plugin',
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
  },
  {
    id: 'skill',
    framework: 'SKILL.md',
    package: 'app.mandate.md/SKILL.md',
    category: 'core',
    icon: '📄',
    tagline: 'Drop this URL into any agent chat. It self-integrates.',
    install: 'https://app.mandate.md/SKILL.md',
    quickStart: 'https://app.mandate.md/SKILL.md',
    code: `# Paste this into your agent's chat:
Follow https://app.mandate.md/SKILL.md to add Mandate policy
enforcement. Use this runtime_key: <your-key>

# Or add to agent config / system prompt:
# The agent reads the skill file, registers itself,
# and starts calling /validate before every transaction.

# Works with any agent that can read URLs:
# Claude, ChatGPT, Codex, OpenClaw, custom agents`,
    lang: 'bash',
    envVars: [
      { name: 'MANDATE_RUNTIME_KEY', note: 'from dashboard' },
    ],
    prerequisites: [],
  },
  {
    id: 'sdk',
    framework: 'Core SDK',
    package: '@mandate/sdk',
    category: 'core',
    icon: '📦',
    tagline: 'Direct HTTP client for any stack or language',
    install: 'bun add @mandate/sdk',
    quickStart: 'bun add @mandate/sdk',
    code: `import { MandateClient, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';

const mandate = new MandateClient({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
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

    ],
    prerequisites: ['local EVM wallet key required'],
    comingSoon: true,
  },
];

const FILTER_TABS: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'agent', label: 'Agent Frameworks' },
  { id: 'assistant', label: 'AI Coding Assistants' },
  { id: 'core', label: 'Core SDK' },
];


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
  const isSoon = item.comingSoon;

  return (
    <button
      onClick={isSoon ? undefined : onClick}
      aria-pressed={active}
      aria-controls="integration-detail"
      style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: '24px', textAlign: 'left',
        cursor: isSoon ? 'default' : 'pointer',
        background: active ? 'var(--bg-raised)' : 'var(--bg-surface)',
        border: `1px solid ${active ? 'var(--accent)' : isSoon ? 'rgba(16, 185, 129, 0.08)' : 'var(--border)'}`,
        borderRadius: 4,
        boxShadow: active ? '0 0 0 1px var(--accent), 0 0 16px rgba(16,185,129,0.1)' : 'none',
        transition: 'all 0.2s ease',
        width: '100%',
        opacity: isSoon ? 0.55 : 1,
        pointerEvents: isSoon ? 'none' : 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isSoon && (
        <div style={{
          position: 'absolute', top: 12, right: 14,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          borderRadius: 3,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            display: 'inline-block',
            background: 'var(--accent)', opacity: 0.6,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9.5,
            color: 'var(--accent)', letterSpacing: '0.06em',
            opacity: 0.8,
          }}>coming soon</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {item.logo
          ? <img src={item.logo} alt={item.framework} style={{ width: 24, height: 24, objectFit: 'contain', ...(isSoon ? { filter: 'grayscale(0.5)' } : {}) }} />
          : <span style={{ fontSize: 24, lineHeight: 1, ...(isSoon ? { filter: 'grayscale(0.4)' } : {}) }}>{item.icon}</span>
        }
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 15,
            fontWeight: 500, color: 'var(--text-primary)',
            marginBottom: 2,
          }}>{item.framework}</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: active ? 'var(--accent)' : 'var(--text-dim)',
            letterSpacing: '0.02em',
          }}>{item.package}</div>
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 13,
        color: 'var(--text-secondary)', lineHeight: 1.5,
      }}>{item.tagline}</div>
    </button>
  );
}

/* ── Detail modal ────────────────────────────────────────────────────────── */
function DetailModal({ item, runtimeKey, onClose }: { item: Integration; runtimeKey: string | null; onClose: () => void }) {
  const [mainCopied, setMainCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const { copy, copied } = useCopy();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const langLabel: Record<string, string> = {
    typescript: 'TypeScript',
    bash: 'Shell',
    json: 'JSON',
    toml: 'TOML',
  };

  const SKILL_URL = 'https://app.mandate.md/SKILL.md';
  const keyDisplay = runtimeKey || '<your-runtime-key>';
  const isOpenClaw = item.id === 'openclaw';
  const activationText = isOpenClaw
    ? `openclaw plugins install @mandate.md/mandate-openclaw-plugin`
    : `Follow ${SKILL_URL} to add Mandate to your ${item.framework} agent. Use this runtime_key: ${keyDisplay}`;

  async function copyQuickStart() {
    await navigator.clipboard.writeText(activationText);
    setMainCopied(true);
    setTimeout(() => setMainCopied(false), 2500);
  }

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(6px)',
        padding: 24,
      }}
    >
      <div
        className="modal-enter"
        style={{
          width: '100%', maxWidth: 640,
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: 'var(--bg-surface)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 1px rgba(16,185,129,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {item.logo
            ? <img src={item.logo} alt={item.framework} style={{ width: 32, height: 32, objectFit: 'contain' }} />
            : <span style={{ fontSize: 32 }}>{item.icon}</span>
          }
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 20,
              color: 'var(--text-primary)', fontWeight: 400,
              letterSpacing: '-0.02em',
            }}>{item.framework}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-dim)', marginTop: 2,
            }}>{item.tagline}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: 18, lineHeight: 1,
              padding: '4px 8px', borderRadius: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '0 28px 28px' }}>
          {/* Quick start — copyable block like Dashboard */}
          <div style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-dim)',
            borderRadius: 8,
            padding: '16px 18px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-primary)',
            lineHeight: 1.8,
            wordBreak: 'break-all',
            marginBottom: 16,
          }}>
            {isOpenClaw ? (
              <>
                <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
                <span style={{ color: 'var(--accent)' }}>openclaw plugins install @mandate.md/mandate-openclaw-plugin</span>
              </>
            ) : (
              <>
                Follow{' '}
                <span style={{ color: 'var(--accent)' }}>{SKILL_URL}</span>
                {' '}to add Mandate to your {item.framework} agent. Use this runtime_key:{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{keyDisplay}</span>
              </>
            )}
          </div>

          {/* Big CTA */}
          <button
            onClick={copyQuickStart}
            style={{
              width: '100%',
              padding: '14px',
              background: mainCopied ? 'var(--accent-glow)' : 'var(--accent)',
              border: `1px solid ${mainCopied ? 'var(--accent)' : 'var(--accent)'}`,
              borderRadius: 8,
              color: mainCopied ? 'var(--accent)' : '#000',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {mainCopied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Copy &amp; paste into agent chat
              </>
            )}
          </button>

          <div style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--text-dim)',
            lineHeight: 1.5,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
          }}>
            {isOpenClaw
              ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, opacity: 0.7 }}>
                  OpenClaw may show a security warning about "env access + network send". This is expected: the plugin reads your Mandate runtime key and sends policy-check requests to app.mandate.md. No other credentials are accessed.{' '}
                  <a href="https://github.com/SwiftAdviser/mandate/tree/master/packages/openclaw-plugin" target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Source is open.</a>
                </span>
              : runtimeKey
                ? 'The agent will self-integrate using SKILL.md.'
                : <>Get your runtime key from <a href="/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Dashboard</a></>
            }
          </div>

          {/* Expandable code example */}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowCode(!showCode)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                borderTop: '1px solid var(--border-dim)',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--text-dim)', letterSpacing: '0.06em',
              }}>
                {showCode ? '▾' : '▸'} Code example
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--text-dim)',
              }}>{langLabel[item.lang] ?? item.lang}</span>
            </button>

            {showCode && (
              <div style={{
                background: '#040709',
                border: '1px solid var(--border)',
                borderRadius: 4, overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'flex-end',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border-dim)',
                }}>
                  <button
                    onClick={() => copy(`${item.id}-code`, item.code)}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: copied[`${item.id}-code`] ? 'var(--accent)' : 'var(--text-dim)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '2px 6px',
                      transition: 'color 0.15s',
                    }}
                  >
                    {copied[`${item.id}-code`] ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre style={{
                  margin: 0, padding: '16px 18px',
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  lineHeight: 1.7, color: 'var(--text-secondary)',
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
                             : isKey    ? 'var(--accent)'
                             : isString ? 'var(--text-secondary)'
                             : 'var(--text-primary)',
                      }}>{line}</span>
                    );
                  })}
                </pre>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Integrations({ runtime_key }: { runtime_key: string | null }) {
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
    <DashboardLayout>
      <div style={{ padding: '32px 36px' }}>
        <style>{`
          @media (max-width: 900px) {
            .int-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 560px) {
            .int-grid { grid-template-columns: 1fr !important; }
            .filter-tabs { flex-wrap: wrap !important; }
          }
          @keyframes modal-in {
            from { opacity: 0; transform: scale(0.97) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .modal-backdrop {
            animation: fade-in 0.15s ease-out;
          }
          .modal-enter {
            animation: modal-in 0.2s ease-out;
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.03em',
            margin: 0,
          }}>
            Integrations
          </h1>
          <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
            Add policy enforcement to your agent framework. Five minutes. No custody changes.
          </p>
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
                color: filter === tab.id ? 'var(--accent)' : 'var(--text-dim)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px',
                borderBottom: `2px solid ${filter === tab.id ? 'var(--accent)' : 'transparent'}`,
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

        {/* Detail modal */}
        {selectedItem && (
          <DetailModal key={selectedItem.id} item={selectedItem} runtimeKey={runtime_key} onClose={() => setSelected(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}
