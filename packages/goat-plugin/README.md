# @mandate/goat-plugin

GOAT SDK plugin that wraps `MandateWallet` from `@mandate/sdk`, giving any GOAT-powered agent policy-enforced on-chain tools with zero boilerplate.

## What it is

`MandatePlugin` is a `PluginBase<EVMWalletClient>` that registers two tools:

- **`mandate_transfer`** — ERC20 transfers validated against your Mandate spending policy
- **`mandate_x402_pay`** — x402 HTTP 402 payments validated against your Mandate spending policy

Both tools call `MandateWallet` under the hood: validate intent → sign → broadcast → confirm. If a transaction exceeds policy limits, `PolicyBlockedError` is caught and re-thrown as a descriptive `Error` the agent can read.

## Installation

```bash
npm install @mandate/goat-plugin @goat-sdk/core
# or
bun add @mandate/goat-plugin @goat-sdk/core
```

> **Peer dependency**: requires `@goat-sdk/core >= 0.3.0`.

## Usage

```typescript
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai'; // or your adapter
import { mandate } from '@mandate/goat-plugin';
import { viem } from '@goat-sdk/wallet-viem';

const tools = await getOnChainTools({
  wallet: viem(walletClient),
  plugins: [
    mandate({
      runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
      privateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
      chainId: 84532, // Base Sepolia (default)
      rpcUrl: process.env.RPC_URL,
    }),
  ],
});
```

### Config options

| Field | Type | Required | Description |
|---|---|---|---|
| `runtimeKey` | `string` | Yes | Mandate runtime key (`mndt_…`) |
| `privateKey` | `` `0x${string}` `` | Yes | Agent wallet private key |
| `chainId` | `number` | No | EVM chain ID (default: `84532` Base Sepolia) |
| `rpcUrl` | `string` | No | Custom RPC URL |

## Tools

### `mandate_transfer`

Transfer ERC20 tokens through Mandate policy enforcement.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `to` | `` `0x${string}` `` | Yes | Recipient address |
| `amount` | `string` | Yes | Amount in token base units (e.g. `"5000000"` for 5 USDC) |
| `tokenAddress` | `` `0x${string}` `` | Yes | ERC20 contract address |
| `waitForConfirmation` | `boolean` | No | Wait for on-chain confirmation before returning |

**Returns:** `{ success: true, txHash, intentId, status }`

**Throws:**
- `"Transfer blocked by Mandate policy: <reason>"` — policy limit exceeded
- `"Transfer requires approval. IntentId: <id>"` — manual approval needed

### `mandate_x402_pay`

Pay for an x402-gated HTTP resource. The tool handles the 402 → payment → retry flow, guarded by Mandate policy.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | URL of the x402-protected resource |
| `headers` | `Record<string, string>` | No | Additional request headers |

**Returns:** `{ success: true, status, ok }`

**Throws:** `"Payment blocked by Mandate policy: <reason>"` — policy limit exceeded

## Error handling

Both tools surface Mandate policy errors as plain `Error` messages the LLM can reason over. Other errors (network, invalid params) propagate as-is.

```typescript
// Agent sees a readable error, can decide to request approval or stop
// "Transfer blocked by Mandate policy: daily limit of $100 exceeded"
```
