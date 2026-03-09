# GOAT SDK Reference

GOAT (Great On-chain Agent Toolkit) is the largest agentic finance toolkit for AI agents.

## Plugin Pattern

Plugins extend `PluginBase<WalletClient>`:

```typescript
import { PluginBase, ToolBase } from "@goat-sdk/core";

export class MyPlugin extends PluginBase<EVMWalletClient> {
  constructor() { super("my-plugin", []); }
  supportsChain(chain: Chain) { return chain.type === "evm"; }
  getTools(wallet: EVMWalletClient): ToolBase[] {
    return [new MyTool()];
  }
}
```

## Tool Definition

```typescript
import { Tool, ToolBase } from "@goat-sdk/core";

class MyTool extends ToolBase {
  @Tool({ name: "transfer", description: "Transfer ERC20 tokens" })
  async transfer(params: TransferParams) {
    // implementation
  }
}
```

## Usage with Agent Frameworks

```typescript
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { openai } from "@ai-sdk/openai";

const tools = await getOnChainTools({
  wallet: viem(walletClient),
  plugins: [myPlugin()],
});
```

## Supported Chains

EVM (Base, Ethereum, Polygon, etc.), Solana, Cosmos, Fuel, Radix.

Source: https://github.com/goat-sdk/goat
