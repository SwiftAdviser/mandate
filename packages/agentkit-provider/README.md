# @mandate/agentkit-provider

Coinbase AgentKit `WalletProvider` + `ActionProvider` for Mandate policy enforcement.

## Install

```bash
npm install @mandate/agentkit-provider @coinbase/agentkit
# or
bun add @mandate/agentkit-provider @coinbase/agentkit
```

## Usage

```typescript
import { MandateWalletProvider, mandateActionProvider } from '@mandate/agentkit-provider';

const walletProvider = new MandateWalletProvider({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  privateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  chainId: 84532, // Base Sepolia
});

// Add to AgentKit
const agent = createAgent({
  walletProvider,
  actionProviders: [mandateActionProvider],
});
```

## Actions

| Action | Description |
|---|---|
| `mandate_transfer` | ERC20 transfer with policy enforcement |
| `mandate_x402_pay` | x402-gated HTTP payment with policy enforcement |

All actions use preflight validation (action-based, chain-agnostic) as the recommended flow. Self-custodial raw validation is available for advanced use cases.

## Error Handling

Policy violations are surfaced as descriptive errors the agent can reason about. Blocked transfers include the block reason. Approval-required intents include the `intentId` for dashboard review.

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Documentation](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
