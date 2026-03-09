# @mandate/openclaw-plugin

OpenClaw plugin that gives agents policy-enforced on-chain actions via the Mandate SDK. Transactions that exceed your configured spending limits are automatically blocked before hitting the chain.

---

## What it is

Two tools wrapped in the OpenClaw plugin format:

- **`mandate_transfer`** — ERC20 token transfers with Mandate policy enforcement
- **`mandate_x402_pay`** — Pay for x402-gated resources with Mandate policy enforcement

When a transaction is blocked by policy, the tool returns `{ success: false, blocked: true, reason: "per_tx_limit_exceeded" }` instead of throwing, so the agent can handle the failure gracefully.

---

## Installation

```bash
npm install @mandate/openclaw-plugin
# or
pnpm add @mandate/openclaw-plugin
```

Requires `@mandate/sdk` as a peer (installed automatically via `workspace:*` in a monorepo).

---

## Usage

### Import in OpenClaw config

```typescript
import mandatePlugin from '@mandate/openclaw-plugin';

export default {
  plugins: [mandatePlugin],
};
```

Or register individual tools:

```typescript
import { transferTool, x402Tool } from '@mandate/openclaw-plugin';

export default {
  tools: [transferTool, x402Tool],
};
```

### Pass context at runtime

```typescript
import { transferTool } from '@mandate/openclaw-plugin';

const result = await transferTool.execute(
  {
    to: '0xRecipient',
    amount: '1000000',        // 1 USDC (6 decimals)
    tokenAddress: '0xUSDC',
  },
  {
    runtimeKey: 'mndt_live_...',
    privateKey: '0xAgentPrivateKey',
    chainId: 8453,            // Base Mainnet
  },
);

if (result.blocked) {
  console.log('Blocked:', result.reason);
} else {
  console.log('TX hash:', result.txHash);
}
```

---

## Tools

### `mandate_transfer`

Transfer ERC20 tokens with policy enforcement.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | yes | Recipient EVM address (`0x...`) |
| `amount` | string | yes | Amount in token smallest units (e.g. `"1000000"` = 1 USDC) |
| `tokenAddress` | string | yes | ERC20 contract address (`0x...`) |
| `runtimeKey` | string | no | Overrides env var |
| `privateKey` | string | no | Overrides env var |
| `chainId` | number | no | Overrides env var |

Returns:

```typescript
{
  success: boolean;
  txHash?: string;
  intentId?: string;
  blocked?: boolean;       // true when policy blocks the tx
  reason?: string;         // e.g. "per_tx_limit_exceeded"
  requiresApproval?: boolean;
}
```

---

### `mandate_x402_pay`

Fetch an x402-gated URL, paying with the agent wallet under Mandate policy.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | yes | URL of the x402-gated resource |
| `headers` | object | no | Extra headers for the request |
| `runtimeKey` | string | no | Overrides env var |
| `privateKey` | string | no | Overrides env var |
| `chainId` | number | no | Overrides env var |

Returns:

```typescript
{
  success: boolean;
  status?: number;     // HTTP status from the upstream resource
  blocked?: boolean;
  reason?: string;
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MANDATE_RUNTIME_KEY` | yes | — | Runtime key from the Mandate dashboard (`mndt_live_...` or `mndt_test_...`) |
| `MANDATE_PRIVATE_KEY` | yes | — | Agent wallet private key (`0x...`) |
| `MANDATE_CHAIN_ID` | no | `84532` | EVM chain ID (`84532` = Base Sepolia, `8453` = Base Mainnet) |

Values in env vars are the fallback. Per-call `params` > `context` > env vars.

---

## Plugin registration via `openclaw.plugin.json`

Place an `openclaw.plugin.json` at your project root to register the plugin with the OpenClaw CLI:

```json
{
  "name": "mandate",
  "version": "0.1.0",
  "description": "Policy-enforced on-chain actions via Mandate spending limits",
  "main": "node_modules/@mandate/openclaw-plugin/dist/plugin.js",
  "tools": ["mandate_transfer", "mandate_x402_pay"],
  "env": {
    "MANDATE_RUNTIME_KEY": {
      "description": "Mandate runtime key (mndt_live_... or mndt_test_...)",
      "required": true
    },
    "MANDATE_PRIVATE_KEY": {
      "description": "Agent wallet private key (0x...)",
      "required": true
    },
    "MANDATE_CHAIN_ID": {
      "description": "EVM chain ID (84532=BaseSepolia, 8453=BaseMainnet)",
      "required": false,
      "default": "84532"
    }
  }
}
```
