# @mandate.md/sdk

Policy guardrails for agent wallets. Not a wallet — a policy layer that wraps yours.

> **Non-custodial.** Your private key never leaves your machine. Mandate validates intent metadata against your policy, then you sign and broadcast.

## Install

```bash
bun add @mandate.md/sdk viem
```

## Two ways to use Mandate

### Option A: CLI (recommended for agents)

```bash
bun add -g @mandate.md/cli
mandate login --name "MyAgent" --address 0x...
mandate validate --to 0x... --reason "Invoice #127" ...
```

The CLI computes intentHash, manages credentials, and chains the flow automatically. See [@mandate.md/cli](https://www.npmjs.com/package/@mandate.md/cli).

### Option B: SDK (for programmatic integration)

Keep reading.

## Quick Start

### 1. Register your agent

```typescript
import { MandateClient } from '@mandate.md/sdk';

const { runtimeKey, claimUrl } = await MandateClient.register({
  name: 'MyAgent',
  evmAddress: '0xYourAgentAddress',
  chainId: 84532, // Base Sepolia
});

// Save runtimeKey to .env
// Display claimUrl to the user to link agent to dashboard
```

### 2. Wrap your wallet

```typescript
import { MandateWallet, USDC, CHAIN_ID } from '@mandate.md/sdk';

// With private key
const wallet = new MandateWallet({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  privateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  chainId: CHAIN_ID.BASE_SEPOLIA,
});

// Or wrap an existing signer
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
  { reason: 'Invoice #127 from Alice' },
);
```

What happens under the hood:
1. Encode ERC20 calldata
2. Estimate gas
3. Compute `intentHash` (keccak256 of canonical tx string)
4. `POST /validate` — policy check
5. Sign locally with your key
6. Broadcast to chain
7. `POST /events` — envelope verification
8. Poll until confirmed

### 4. Low-level: MandateClient

For custodial wallets or custom flows where you control signing:

```typescript
import { MandateClient, computeIntentHash } from '@mandate.md/sdk';

const client = new MandateClient({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
});

const intentHash = computeIntentHash({
  chainId: 84532, nonce: 0,
  to: tokenAddress, calldata: encodedCalldata,
  valueWei: '0', gasLimit: '90000',
  maxFeePerGas: '1000000000',
  maxPriorityFeePerGas: '1000000000',
});

const { intentId } = await client.validate({
  ...txParams, intentHash,
  reason: 'Invoice #127 from Alice',
});

// Sign and broadcast with your own wallet...

await client.postEvent(intentId, txHash);
const status = await client.getStatus(intentId);
```

### 5. x402 payments

```typescript
const response = await wallet.x402Pay('https://api.example.com/data');
```

## Error Handling

```typescript
import {
  PolicyBlockedError,
  ApprovalRequiredError,
  CircuitBreakerError,
  RiskBlockedError,
} from '@mandate.md/sdk';

try {
  await wallet.transfer(to, amount, token);
} catch (err) {
  if (err instanceof PolicyBlockedError) {
    // err.blockReason — "per_tx_limit_exceeded", "daily_quota_exceeded", etc.
    // err.detail — "$150 exceeds $100/tx limit"
    // err.declineMessage — human-readable explanation
  }
  if (err instanceof ApprovalRequiredError) {
    // err.intentId, err.approvalId
    // Use wallet.transferWithApproval() to auto-wait
  }
  if (err instanceof CircuitBreakerError) {
    // Agent frozen. Owner resets via dashboard.
  }
  if (err instanceof RiskBlockedError) {
    // err.blockReason — "aegis_critical_risk"
  }
}
```

## Exports

| Export | Description |
|--------|-------------|
| `MandateWallet` | High-level: validate + sign + broadcast + poll |
| `MandateClient` | Low-level: API wrapper for custom flows |
| `computeIntentHash` | Deterministic keccak256 of canonical tx string |
| `PolicyBlockedError` | Thrown when policy blocks the transaction |
| `ApprovalRequiredError` | Thrown when human approval is needed |
| `CircuitBreakerError` | Thrown when agent is frozen |
| `RiskBlockedError` | Thrown on risk assessment failure |
| `USDC` | Token addresses (`BASE_SEPOLIA`, `BASE_MAINNET`) |
| `CHAIN_ID` | Chain IDs (`BASE_SEPOLIA`, `BASE_MAINNET`) |

Sub-path import for client-only (smaller bundle):
```typescript
import { MandateClient } from '@mandate.md/sdk/client';
```

## Links

- [SKILL.md](https://app.mandate.md/SKILL.md) — Full API reference for AI agents
- [Dashboard](https://app.mandate.md/dashboard) — Configure policies
- [@mandate.md/cli](https://www.npmjs.com/package/@mandate.md/cli) — Agent-discoverable CLI
- [GitHub](https://github.com/SwiftAdviser/mandate)
