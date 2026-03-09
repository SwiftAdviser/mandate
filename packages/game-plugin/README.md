# @mandate/game-plugin

Virtuals Protocol GAME SDK plugin for [Mandate](https://mandate.krutovoy.me) — policy-enforced on-chain actions for autonomous agents.

Mandate wraps any agent wallet with spending limits, approval flows, and circuit breakers. This plugin exposes Mandate-guarded tools as GAME SDK `GameFunction`s ready to drop into any `GameWorker`.

---

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
  runtimeKey: 'mndt_live_...',       // from Mandate dashboard
  privateKey: '0xYOUR_PRIVATE_KEY',  // agent wallet key
  chainId: 84532,                    // Base Sepolia (default)
  rpcUrl: 'https://sepolia.base.org',
  workerDescription: 'Finance worker for DeFi agent',
});

const agent = new GameAgent('YOUR_GAME_API_KEY', {
  name: 'DeFi Agent',
  goal: 'Manage on-chain positions within spending policy',
  description: 'An agent that executes DeFi strategies under Mandate guardrails',
  workers: [mandateWorker],
});

await agent.init();
await agent.run(10);
```

### Individual functions

You can also compose functions manually:

```typescript
import { createTransferFunction, createX402PayFunction } from '@mandate/game-plugin';
import { GameWorker } from '@virtuals-protocol/game';

const config = { runtimeKey: 'mndt_live_...', privateKey: '0x...', chainId: 84532 };

const worker = new GameWorker({
  id: 'my-worker',
  name: 'Custom Finance Worker',
  description: 'Custom worker with Mandate tools',
  functions: [
    createTransferFunction(config),
    createX402PayFunction(config),
  ],
});
```

### Available functions

| Function | Description |
|---|---|
| `mandate_transfer` | Transfer ERC20 tokens. Blocked if agent exceeds spending limits. |
| `mandate_x402_pay` | Pay for x402-gated APIs/resources. Policy-enforced. |

### Error handling

- `PolicyBlockedError` — returned as `{ status: 'failed' }` with the block reason surfaced to the agent.
- `ApprovalRequiredError` — returned as `{ status: 'pending' }` with the `intentId` for human approval via Mandate dashboard.
- Other errors are re-thrown so GAME SDK can handle them.

---

## Python

### Install

```bash
pip install game_sdk
# mandate_sdk Python package (when available):
# pip install mandate_sdk
```

### Usage

```python
from mandate_game_plugin import MandatePlugin
from game_sdk.game.agent import GameAgent
from game_sdk.game.worker import GameWorker

plugin = MandatePlugin(
    runtime_key="mndt_live_...",       # or set MANDATE_RUNTIME_KEY env var
    rpc_url="https://sepolia.base.org", # or set MANDATE_RPC_URL env var
    chain_id=84532,
)

worker = GameWorker(
    id="mandate-worker",
    name="Mandate Finance Worker",
    description="Executes on-chain transactions with policy enforcement",
    functions=plugin.functions,
)

agent = GameAgent(
    api_key="YOUR_GAME_API_KEY",
    name="DeFi Agent",
    goal="Manage on-chain positions within spending policy",
    description="An agent that executes DeFi strategies under Mandate guardrails",
    workers=[worker],
)

agent.compile()
agent.run()
```

### Environment variables

| Variable | Description |
|---|---|
| `MANDATE_RUNTIME_KEY` | Runtime key from Mandate dashboard |
| `MANDATE_RPC_URL` | EVM RPC endpoint (default: `https://sepolia.base.org`) |

---

## Configuration

| Option | Type | Description |
|---|---|---|
| `runtimeKey` | `string` | Mandate runtime key (`mndt_live_...`) |
| `privateKey` | `` `0x${string}` `` | Agent wallet private key |
| `chainId` | `number` | Chain ID (default: `84532` — Base Sepolia) |
| `rpcUrl` | `string?` | RPC endpoint override |
| `workerDescription` | `string?` | Custom description for the GAME worker |

---

## License

MIT
