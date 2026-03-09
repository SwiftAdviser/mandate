# Coinbase AgentKit Reference

AgentKit bridges AI agents and blockchain functionality.

## ActionProvider Pattern

```typescript
import { ActionProvider, CreateAction, WalletProvider } from "@coinbase/agentkit";
import { z } from "zod";

const TransferSchema = z.object({
  to: z.string().describe("Recipient address"),
  amount: z.string().describe("Amount in token units"),
  tokenAddress: z.string().describe("ERC20 token contract address"),
});

class MandateActionProvider extends ActionProvider {
  @CreateAction({
    name: "transfer",
    description: "Transfer ERC20 tokens via Mandate policy check",
    schema: TransferSchema,
  })
  async transfer(walletProvider: WalletProvider, args: z.infer<typeof TransferSchema>) {
    // implementation
  }
}
```

## WalletProvider Pattern

```typescript
import { WalletProvider } from "@coinbase/agentkit";

class MandateWalletProvider extends WalletProvider {
  async signMessage(message: string): Promise<string> { ... }
  async sendTransaction(tx: Transaction): Promise<string> { ... }
  getAddress(): string { ... }
  getNetwork(): Network { ... }
}
```

## Usage

```typescript
import { AgentKit } from "@coinbase/agentkit";

const agentkit = await AgentKit.from({
  walletProvider: new MandateWalletProvider({ runtimeKey, privateKey }),
  actionProviders: [new MandateActionProvider()],
});
```

## Key Features

- Secure wallet management
- EVM and Solana support
- LangChain, Eliza, Vercel AI SDK compatible

Source: https://docs.cdp.coinbase.com/agentkit/docs/welcome
