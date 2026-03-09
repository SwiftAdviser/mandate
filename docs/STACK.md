# Mandate — Integration Stack

Non-custodial policy layer for agent wallets. Spend limits (per-tx / per-day / per-month),
allowlists, selector blocks, and human-approval flows — enforced at the wallet layer before
any on-chain action signs.

---

## Architecture

```
packages/
  sdk/                     ← Core SDK: MandateWallet + MandateClient
  hooks/claude-code/       ← Claude Code PreToolUse hook
  mcp-server/              ← Cloudflare Workers MCP (search + execute)
  eliza-plugin/            ← @elizaos/core plugin
  goat-plugin/             ← GOAT SDK plugin
  agentkit-provider/       ← Coinbase AgentKit WalletProvider + ActionProvider
  game-plugin/             ← GAME SDK (Virtuals Protocol) GameWorker
  openclaw-plugin/         ← OpenClaw plugin manifest
  acp-plugin/              ← ACP (Agent Commerce Protocol) by Virtuals
```

All packages share `@mandate/sdk` via `"@mandate/sdk": "workspace:*"`.

---

## Packages

### `@mandate/sdk`

Core. `MandateWallet` is the high-level interface (validate → sign → broadcast → confirm).
`MandateClient` is the low-level HTTP client for direct API calls.

**Install:** `bun add @mandate/sdk`

```typescript
import { MandateWallet, PolicyBlockedError } from '@mandate/sdk';

const wallet = new MandateWallet({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  privateKey:  process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  chainId: 84532, // Base Sepolia
});

// ERC20 transfer — blocked if policy says no
const { txHash } = await wallet.transfer(
  '0xRecipient',
  '5000000',                                        // 5 USDC (6 decimals)
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e',     // USDC Base Sepolia
);

// x402 payment
const response = await wallet.x402Pay('https://api.example.com/endpoint');
```

**Key exports:**
- `MandateWallet` — transfer, x402Pay
- `MandateClient` — validate, register, getStatus
- `PolicyBlockedError` / `MandateBlockedError` — alias; has `.blockReason: string`
- `ApprovalRequiredError` — has `.intentId`, `.approvalId`
- `CircuitBreakerError`
- `USDC` — `{ BASE_SEPOLIA, BASE_MAINNET }`
- `CHAIN_ID` — `{ BASE_SEPOLIA, BASE_MAINNET }`

---

### `@mandate/claude-code-hook`

Claude Code `PreToolUse` hook. Intercepts payment/transfer tool calls before execution.

**Trigger pattern:** `Bash | mcp__.*transfer.* | mcp__.*payment.*`
- For `Bash`: checks tool input for payment keywords (`transfer`, `pay`, `send`, `0x<addr>`)
- For MCP tools: intercepts on name alone (no keyword check needed)

**Behaviour:** Calls `POST /api/validate` on Mandate. On `allowed: false` or HTTP 422 — exits
with code 2 + `{"decision":"block","reason":"..."}`. Fails open on network errors.

**Env vars:** `MANDATE_RUNTIME_KEY`, `MANDATE_API_URL` (default `http://localhost:8000`)

**Two modes:**

| Mode | File | Notes |
|------|------|-------|
| Shell script | `mandate-hook.sh` | Zero-dep; needs `bash`, `curl`, `jq` |
| HTTP server | `mandate-hook-server.ts` | Persistent; lower latency |

**Setup (`~/.claude/settings.json`):**
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|mcp__.*transfer.*|mcp__.*payment.*",
      "hooks": [{ "type": "command", "command": "~/.claude/hooks/mandate-hook.sh" }]
    }]
  }
}
```

---

### `@mandate/mcp-server`

Cloudflare Workers MCP server. Two-tool pattern: `search` + `execute`. Reduces LLM context
overhead ~99.9% vs exposing full API schema.

| Tool | Purpose |
|------|---------|
| `search` | Look up schema, policy fields, example payloads |
| `execute` | Call Mandate API (`validate` / `register` / `status`) |

**Deploy:**
```bash
cd packages/mcp-server
npx wrangler deploy
npx wrangler secret put MANDATE_RUNTIME_KEY
```

**Codex CLI (`~/.codex/config.toml`):**
```toml
[[mcp_servers]]
name = "mandate"
url  = "https://mandate-mcp.<subdomain>.workers.dev/mcp"
```

**Claude Desktop / any MCP host:**
```json
{
  "mcpServers": {
    "mandate": {
      "command": "npx",
      "args": ["mcp-remote", "https://mandate-mcp.<subdomain>.workers.dev/mcp"]
    }
  }
}
```

---

### `@mandate/eliza-plugin`

ElizaOS (`@elizaos/core`) plugin. Exports `mandatePlugin` — drop into `AgentRuntime`.

**Actions:** `MANDATE_TRANSFER`, `MANDATE_X402_PAY`, `MANDATE_SEND_ETH`
**Providers:** `walletStateProvider` (returns balance + policy quota)

```typescript
import { mandatePlugin } from '@mandate/eliza-plugin';

new AgentRuntime({
  plugins: [mandatePlugin],
  // ...
  settings: {
    MANDATE_RUNTIME_KEY: '...',
    AGENT_PRIVATE_KEY:   '...',
    CHAIN_ID:            '84532',
  },
});
```

---

### `@mandate/goat-plugin`

GOAT SDK (`@goat-sdk/core`) plugin. `MandatePlugin` extends `PluginBase<EVMWalletClient>`.

**Tools:** `mandate_transfer`, `mandate_x402_pay`

```typescript
import { mandate } from '@mandate/goat-plugin';
import { getOnChainTools } from '@goat-sdk/core';

const tools = await getOnChainTools({
  wallet,
  plugins: [mandate({ runtimeKey, privateKey })],
});
```

---

### `@mandate/agentkit-provider`

Coinbase AgentKit `WalletProvider` + `ActionProvider`.

```typescript
import { AgentKit } from '@coinbase/agentkit';
import { MandateWalletProvider, mandateActionProvider } from '@mandate/agentkit-provider';

const agentkit = await AgentKit.from({
  walletProvider: new MandateWalletProvider({ runtimeKey, privateKey, chainId: 84532 }),
  actionProviders: [mandateActionProvider()],
});
```

**Actions:** `mandate_transfer`, `mandate_x402_pay`, `mandate_get_policy`, `mandate_get_quota`

---

### `@mandate/game-plugin`

GAME SDK (`@virtuals-protocol/game`) `GameWorker` with Mandate enforcement.

```typescript
import { createMandateGameWorker } from '@mandate/game-plugin';

const worker = createMandateGameWorker({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  privateKey:  process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  chainId:     84532,
});

const agent = new GameAgent(process.env.GAME_API_KEY!, {
  name:    'My Agent',
  goal:    '...',
  workers: [worker],
});
```

**GameFunctions:** `mandate_transfer`, `mandate_x402_pay`

---

### `@mandate/openclaw-plugin`

OpenClaw plugin manifest. Exports `transferTool`, `x402Tool`.

```typescript
import mandatePlugin from '@mandate/openclaw-plugin';
// mandatePlugin.tools → [transferTool, x402Tool]
```

Each tool: `{ name, description, parameters (JSON Schema), execute }`.

---

### `@mandate/acp-plugin`

ACP (Agent Commerce Protocol) by Virtuals Protocol. Intercepts at the **NEGOTIATION** phase
before calling `approvePayment()` — the only point where the USD amount is known.

**Key insight:** ACP payments go through ACP's own smart wallet (not via direct EVM tx signing),
so Mandate validation uses a synthetic USDC ERC20 calldata payload derived from
`paymentRequestData.budget.usdValue` (1 USD ≈ 1 USDC = 1 000 000 raw units).

```typescript
import { MandateAcpClient } from '@mandate/acp-plugin';

const client = new MandateAcpClient({
  acpApiKey:         process.env.LITE_AGENT_API_KEY!,
  mandateRuntimeKey: process.env.MANDATE_RUNTIME_KEY!,
});

// Full flow: create → poll → validate → pay
const result = await client.createAndPay(
  '0xProviderWallet',
  'Execute Trade',
  { pair: 'ETH/USDC' },
);
// result: { jobId, accepted, blocked, blockReason?, phase }

// Or split: create → payJob separately
const { jobId } = await client.createJob('0xProvider', 'Offering', {});
// ... wait for NEGOTIATION phase ...
const payResult = await client.payJob(jobId);
// payResult: { jobId, accepted, blocked, blockReason?, requiresApproval? }
```

**Job lifecycle:**
```
REQUEST → NEGOTIATION → TRANSACTION → EVALUATION → COMPLETED
                ↓ (policy check here)      ↓
             REJECTED                  REJECTED / EXPIRED
```

**payJob() outcomes:**

| Mandate result | `approvePayment` called | Return |
|----------------|------------------------|--------|
| `allowed: true` | `(jobId, true)` | `{ accepted: true, blocked: false }` |
| `PolicyBlockedError` | `(jobId, false, reason)` | `{ accepted: false, blocked: true, blockReason }` |
| `ApprovalRequiredError` | not called | `{ accepted: false, blocked: false, requiresApproval: true }` |

**Config:**
```typescript
interface MandateAcpConfig {
  acpApiKey:         string;   // LITE_AGENT_API_KEY from ACP dashboard
  builderCode?:      string;   // ACP_BUILDER_CODE (optional)
  acpApiUrl?:        string;   // default: https://claw-api.virtuals.io
  mandateRuntimeKey: string;   // mndt_live_... or mndt_test_...
  mandateApiUrl?:    string;   // default: https://api.mandate.krutovoy.me
}
```

---

## Error Handling (all packages)

```typescript
import { PolicyBlockedError, ApprovalRequiredError, CircuitBreakerError } from '@mandate/sdk';

try {
  await wallet.transfer(/* ... */);
} catch (err) {
  if (err instanceof PolicyBlockedError) {
    // err.blockReason: 'per_tx_limit_exceeded' | 'per_day_limit_exceeded' | ...
    console.log('Blocked:', err.blockReason);
  } else if (err instanceof ApprovalRequiredError) {
    // Needs human approval — check dashboard
    console.log('Pending approval:', err.intentId);
  } else if (err instanceof CircuitBreakerError) {
    // All transactions halted by circuit breaker
  } else {
    throw err;
  }
}
```

---

## Environment Variables

| Var | Used by | Notes |
|-----|---------|-------|
| `MANDATE_RUNTIME_KEY` | all packages | `mndt_live_...` or `mndt_test_...` |
| `MANDATE_API_URL` | all packages | Default: `https://api.mandate.krutovoy.me` |
| `AGENT_PRIVATE_KEY` | sdk, eliza, goat, agentkit, game | EVM private key `0x...` |
| `LITE_AGENT_API_KEY` | acp-plugin | From ACP dashboard |
| `ACP_BUILDER_CODE` | acp-plugin | Optional |
| `GAME_API_KEY` | game-plugin | GAME SDK API key |

---

## Tests

```bash
# All packages
bun run --filter '*' test

# Single package
bun run --filter '@mandate/acp-plugin' test
```

All 9 packages have unit tests (vitest). Total: 100+ tests.
