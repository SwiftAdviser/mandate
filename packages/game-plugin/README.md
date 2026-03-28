# @mandate/game-plugin

Virtuals Protocol GAME SDK plugin for [Mandate](https://app.mandate.md). Policy-enforced on-chain actions for autonomous agents.

## TypeScript

### Install

```bash
npm install @mandate/game-plugin @virtuals-protocol/game
# or
bun add @mandate/game-plugin @virtuals-protocol/game
```

### Usage

```typescript
import { GameAgent } from '@virtuals-protocol/game';
import { createMandateWorker } from '@mandate/game-plugin';

const mandateWorker = createMandateWorker({
  runtimeKey: 'mndt_live_...',
  privateKey: '0xYOUR_PRIVATE_KEY',
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
});

const agent = new GameAgent('YOUR_GAME_API_KEY', {
  name: 'DeFi Agent',
  goal: 'Manage on-chain positions within spending policy',
  description: 'Agent that executes DeFi strategies under Mandate guardrails',
  workers: [mandateWorker],
});

await agent.init();
await agent.run(10);
```

All tools use preflight validation (action-based, chain-agnostic) as the recommended flow. Self-custodial raw validation is available for advanced use cases.

### Functions

| Function | Description |
|---|---|
| `mandate_transfer` | ERC20 transfer with policy enforcement |
| `mandate_x402_pay` | x402-gated HTTP payment with policy enforcement |

### Error Handling

- `PolicyBlockedError`: returned as `{ status: 'failed' }` with block reason
- `ApprovalRequiredError`: returned as `{ status: 'pending' }` with `intentId` for dashboard approval

## Python

### Install

```bash
pip install game_sdk
```

### Usage

```python
from mandate_game_plugin import MandatePlugin
from game_sdk.game.agent import GameAgent
from game_sdk.game.worker import GameWorker

plugin = MandatePlugin(
    runtime_key="mndt_live_...",
    rpc_url="https://sepolia.base.org",
    chain_id=84532,
)

worker = GameWorker(
    id="mandate-worker",
    name="Mandate Finance Worker",
    description="On-chain transactions with policy enforcement",
    functions=plugin.functions,
)

agent = GameAgent(
    api_key="YOUR_GAME_API_KEY",
    name="DeFi Agent",
    goal="Manage on-chain positions within spending policy",
    workers=[worker],
)

agent.compile()
agent.run()
```

## Config

| Option | Type | Description |
|---|---|---|
| `runtimeKey` | `string` | Mandate runtime key (`mndt_live_...`) |
| `privateKey` | `` `0x${string}` `` | Agent wallet private key |
| `chainId` | `number` | Chain ID (default: `84532`, Base Sepolia) |
| `rpcUrl` | `string?` | RPC endpoint override |

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Documentation](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
