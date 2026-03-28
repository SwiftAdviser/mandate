# @mandate/eliza-plugin

ElizaOS plugin for policy-enforced on-chain actions via Mandate spending limits.

## Install

```bash
npm install @mandate/eliza-plugin @elizaos/core
# or
bun add @mandate/eliza-plugin @elizaos/core
```

## Usage

```typescript
import { mandatePlugin } from '@mandate/eliza-plugin';

// Add to your ElizaOS agent
const agent = createAgent({
  plugins: [mandatePlugin],
});
```

Configure via environment variables:

| Variable | Description |
|---|---|
| `MANDATE_RUNTIME_KEY` | Runtime key (`mndt_...`) from Mandate dashboard |
| `AGENT_PRIVATE_KEY` | Agent wallet private key |
| `MANDATE_CHAIN_ID` | Chain ID (default: `84532`, Base Sepolia) |

## Actions

| Action | Description |
|---|---|
| `MANDATE_TRANSFER` | ERC20 transfer with policy enforcement |
| `MANDATE_X402_PAY` | x402-gated HTTP payment with policy enforcement |
| `MANDATE_SEND_ETH` | Native ETH transfer with policy enforcement |

All actions use preflight validation (action-based, chain-agnostic) as the recommended flow. Self-custodial raw validation is available for advanced use cases.

## Error Handling

Policy violations surface as readable messages the agent can reason about:
- `PolicyBlockedError`: spending limit exceeded
- `ApprovalRequiredError`: human approval needed, includes `intentId`

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Documentation](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
