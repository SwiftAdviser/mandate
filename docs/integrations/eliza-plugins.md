# ElizaOS Plugins Reference

ElizaOS is a TypeScript framework for creating autonomous AI agents.

## Plugin Structure

Plugins export `{ name, actions, providers, evaluators }`:

```typescript
export const myPlugin: Plugin = {
  name: "my-plugin",
  description: "...",
  actions: [action1, action2],
  providers: [walletProvider],
  evaluators: [],
};
```

## Actions

```typescript
const transferAction: Action = {
  name: "TRANSFER",
  description: "Transfer ERC20 tokens",
  similes: ["SEND_TOKENS", "PAY"],
  validate: async (runtime, message) => true,
  handler: async (runtime, message, state, options, callback) => {
    // Implementation
    return true;
  },
  examples: [],
};
```

## Providers

```typescript
const walletProvider: Provider = {
  get: async (runtime, message, state) => {
    return "wallet state string";
  },
};
```

## Usage

```typescript
import { AgentRuntime } from "@elizaos/core";

const runtime = new AgentRuntime({
  plugins: [mandatePlugin],
  // ...
});
```

## Key Features

- 90+ integrated plugins (Discord, Twitter, Telegram, Ethereum, Solana)
- Persistent memory systems
- Multi-environment deployment (local, Docker, Eliza Cloud)

Source: https://eliza.how/docs/plugins
