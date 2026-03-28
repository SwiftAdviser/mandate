# @mandate.md/sdk

Intent-aware policy layer for agent wallets. Validate **why** your agent wants to spend before it spends.

## Install

```bash
bun add @mandate.md/sdk viem
# or
npm install @mandate.md/sdk viem
```

## Quick start

```typescript
import { MandateClient } from '@mandate.md/sdk';

const client = new MandateClient({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
});

// Validate before every transaction
const result = await client.validate({
  action: 'transfer',
  amount: '50',
  to: '0xRecipient',
  token: 'USDC',
  reason: 'Invoice #127 from Alice',
});

if (result.allowed) {
  // proceed with your wallet
}
```

The `reason` field is where Mandate catches prompt injections, urgency pressure, and vague justifications that session keys can't see.

## Register an agent

```typescript
const { runtimeKey, claimUrl } = await MandateClient.register({
  name: 'MyAgent',
  walletAddress: 'YourAgentAddress', // EVM 0x..., Solana base58, or TON
});
// Owner visits claimUrl to link agent to their dashboard
```

## Error handling

```typescript
import {
  PolicyBlockedError,
  ApprovalRequiredError,
  CircuitBreakerError,
  RiskBlockedError,
} from '@mandate.md/sdk';

try {
  await client.validate({ action: 'transfer', amount: '500', reason: '...' });
} catch (err) {
  if (err instanceof PolicyBlockedError) {
    // err.blockReason: "exceeds_daily_limit", "address_not_allowed", etc.
    // err.declineMessage: human-readable counter-evidence for the agent
  }
  if (err instanceof ApprovalRequiredError) {
    // err.intentId, err.approvalId
    // Transaction paused. Owner approves via dashboard/Telegram.
    const status = await client.waitForApproval(err.intentId);
  }
  if (err instanceof CircuitBreakerError) {
    // Agent frozen. Mismatch detected between validated and broadcast tx.
  }
  if (err instanceof RiskBlockedError) {
    // On-chain risk: honeypot, malicious contract, flagged address
  }
}
```

## Scan for unprotected calls

```bash
npx @mandate.md/cli scan
```

Or use the [Claude Code plugin](https://github.com/SwiftAdviser/claude-mandate-plugin): it scans automatically on every session start.

## Exports

| Export | Description |
|--------|-------------|
| `MandateClient` | Validate transactions against spend limits, allowlists, reason analysis |
| `MandateWallet` | Full sign + broadcast flow for self-custodial wallets |
| `PolicyBlockedError` | Policy blocks the transaction |
| `ApprovalRequiredError` | Human approval needed |
| `CircuitBreakerError` | Agent frozen (envelope mismatch) |
| `RiskBlockedError` | On-chain risk detected |
| `USDC` | Token addresses (`BASE_SEPOLIA`, `BASE_MAINNET`) |
| `CHAIN_ID` | Chain IDs (`BASE_SEPOLIA`, `BASE_MAINNET`) |

Sub-path import for smaller bundle:
```typescript
import { MandateClient } from '@mandate.md/sdk/client';
```

## CLI

```bash
npx @mandate.md/cli validate --action transfer --amount 50 --reason "Invoice #127"
```

See [@mandate.md/cli](https://www.npmjs.com/package/@mandate.md/cli).

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Docs](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
