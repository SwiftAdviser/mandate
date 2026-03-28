# @mandate/acp-plugin

Mandate policy enforcement for ACP (Agent Commerce Protocol) by Virtuals Protocol. Validates spend limits before approving ACP job payments.

## Install

```bash
npm install @mandate/acp-plugin
# or
bun add @mandate/acp-plugin
```

## Usage

```typescript
import { MandateAcpClient } from '@mandate/acp-plugin';

const client = new MandateAcpClient({
  runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
  privateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  chainId: 84532, // Base Sepolia
});

// Create and pay for an ACP job, policy-enforced
const result = await client.createAndPay({
  offering: jobOffering,
  reason: 'Data analysis job',
});
```

All payments use preflight validation (action-based, chain-agnostic) as the recommended flow. Every ACP payment is checked against your Mandate spending policy before execution.

## Exports

| Export | Description |
|---|---|
| `MandateAcpClient` | ACP client with Mandate policy enforcement |
| `AcpClient` | Base ACP client (no policy layer) |

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Documentation](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
