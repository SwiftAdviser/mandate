# @mandate/sdk

Policy guardrails for agent wallets. Not a wallet — a policy layer.

> **NON-CUSTODIAL**: your private key never leaves your machine. Mandate only validates intent metadata against your policy before you sign and broadcast.

## Install

```bash
bun add @mandate/sdk viem
```

## Quick Start

### 1. Register your agent

```typescript
import { MandateClient } from '@mandate/sdk';

const { runtimeKey, claimUrl } = await MandateClient.register({
  name: 'MyAgent',
  evmAddress: '0xYourAgentAddress',
  chainId: 84532, // Base Sepolia
});

// Save runtimeKey to .env
// Send claimUrl to human owner to link agent to dashboard
```

### 2. Create a MandateWallet

```typescript
import { MandateWallet, USDC, CHAIN_ID } from '@mandate/sdk';

// Option A: With private key
const wallet = new MandateWallet({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  privateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  chainId: CHAIN_ID.BASE_SEPOLIA,
});

// Option B: Wrap your existing wallet/signer
const wallet = new MandateWallet({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  chainId: CHAIN_ID.BASE_SEPOLIA,
  signer: {
    sendTransaction: (tx) => yourWallet.sendTransaction(tx),
    getAddress: () => yourWallet.address,
  },
});
```

### 3. Transfer with policy enforcement

```typescript
const { txHash, status } = await wallet.transfer(
  '0xRecipient',
  '5000000', // 5 USDC (6 decimals)
  USDC.BASE_SEPOLIA,
);
```

### 4. x402 payments

```typescript
const response = await wallet.x402Pay('https://api.example.com/data');
```

## Error Handling

| Error | blockReason | What to do |
|-------|-------------|------------|
| `PolicyBlockedError` | `per_tx_limit_exceeded` | Amount too high. Check `error.detail` for limits |
| `PolicyBlockedError` | `daily_quota_exceeded` | Daily limit hit. Resets midnight UTC |
| `PolicyBlockedError` | `address_not_allowed` | Recipient not in allowlist |
| `CircuitBreakerError` | `circuit_breaker_active` | Agent frozen. Owner must reset via dashboard |
| `ApprovalRequiredError` | `approval_required` | Human must approve. Poll status or use `sendTransactionWithApproval()` |

## Links

- [SKILL.md](https://app.mandate.md/SKILL.md) — Full API reference for AI agents
- [Dashboard](https://app.mandate.md) — Configure policies
- [GitHub](https://github.com/SwiftAdviser/mandate)
