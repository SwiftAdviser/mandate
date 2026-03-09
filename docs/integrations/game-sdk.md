# GAME SDK Reference (by Virtuals Protocol)

GAME Python SDK allows you to interact and develop agents powered by the GAME architecture.

## Python Usage

```python
from game_sdk.game.agent import Agent
from game_sdk.game.worker import Worker
from game_sdk.game.custom_types import Function, Argument, FunctionResult

# Define a function/tool
def transfer_tokens(to_address: str, amount: str, token: str) -> FunctionResult:
    # implementation
    return FunctionResult(status="success", data={"txHash": "0x..."})

transfer_function = Function(
    fn_name="transfer_tokens",
    fn_description="Transfer ERC20 tokens with policy enforcement",
    args=[
        Argument(name="to_address", description="Recipient address"),
        Argument(name="amount", description="Amount to transfer"),
        Argument(name="token", description="Token symbol or address"),
    ],
    executable=transfer_tokens,
)
```

## Agent Creation (Python)

```python
agent = Agent(
    api_key="your_game_api_key",
    name="DeFi Agent",
    agent_goal="Manage DeFi operations with spending limits",
    agent_description="An agent that uses Mandate for policy enforcement",
    get_agent_state_fn=lambda: {"balance": "100 USDC"},
    workers=[worker_with_mandate_tools],
)
agent.compile()
agent.run()
```

## TypeScript Usage (game-node)

```typescript
import { GameAgent, GameWorker, GameFunction } from "@virtuals-protocol/game";

const transferFunction = new GameFunction({
  name: "transfer_tokens",
  description: "Transfer ERC20 tokens via Mandate",
  args: [
    { name: "to", description: "Recipient address" },
    { name: "amount", description: "Amount in token units" },
  ],
  executable: async (args) => {
    // implementation using MandateWallet
  },
});

const agent = new GameAgent("api_key", {
  name: "Mandate Agent",
  goal: "Execute DeFi operations within spending limits",
  description: "Uses Mandate for policy enforcement",
  workers: [new GameWorker({ functions: [transferFunction] })],
});
```

## Installation

```bash
# Python
pip install game_sdk

# TypeScript
npm install @virtuals-protocol/game
```

Source: https://github.com/game-by-virtuals/game-python
