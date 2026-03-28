# @mandate/goat-plugin

GOAT SDK plugin for policy-enforced on-chain actions via Mandate spending limits.

## Install

```bash
npm install @mandate/goat-plugin @goat-sdk/core
# or
bun add @mandate/goat-plugin @goat-sdk/core
```

> **Peer dependency**: requires `@goat-sdk/core >= 0.3.0`.

## Usage

```typescript
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai';
import { mandate } from '@mandate/goat-plugin';
import { viem } from '@goat-sdk/wallet-viem';

const tools = await getOnChainTools({
  wallet: viem(walletClient),
  plugins: [
    mandate({
      runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
      privateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
      chainId: 84532,
      rpcUrl: process.env.RPC_URL,
    }),
  ],
});
```

## Tools

| Tool | Description |
|---|---|
| `mandate_transfer` | ERC20 transfer with policy enforcement |
| `mandate_x402_pay` | x402-gated HTTP payment with policy enforcement |

All tools use preflight validation (action-based, chain-agnostic) as the recommended flow. Self-custodial raw validation with `MandateWallet` is used under the hood for the full sign + broadcast cycle.

## Config

| Field | Type | Required | Description |
|---|---|---|---|
| `runtimeKey` | `string` | Yes | Mandate runtime key (`mndt_...`) |
| `privateKey` | `` `0x${string}` `` | Yes | Agent wallet private key |
| `chainId` | `number` | No | EVM chain ID (default: `84532` Base Sepolia) |
| `rpcUrl` | `string` | No | Custom RPC URL |

## Error Handling

Policy violations are surfaced as plain `Error` messages the LLM can reason over:
- `"Transfer blocked by Mandate policy: <reason>"` : policy limit exceeded
- `"Transfer requires approval. IntentId: <id>"` : manual approval needed

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Documentation](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
