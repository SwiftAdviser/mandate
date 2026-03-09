# OpenClaw Plugin Reference

OpenClaw agent tools are TypeScript modules exporting a plugin manifest.

## Plugin Structure

```typescript
export default {
  name: "mandate",
  version: "0.1.0",
  description: "Policy-enforced spending limits via Mandate",
  tools: [transferTool, x402Tool],
};
```

## Tool Definition

```typescript
const transferTool = {
  name: "transfer",
  description: "Transfer ERC20 tokens with Mandate policy check",
  parameters: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient address" },
      amount: { type: "string", description: "Amount in token units" },
      tokenAddress: { type: "string", description: "ERC20 token contract address" },
    },
    required: ["to", "amount", "tokenAddress"],
  },
  execute: async (params: { to: string; amount: string; tokenAddress: string }) => {
    // implementation using MandateWallet
    return { success: true, txHash: "0x..." };
  },
};
```

## Plugin Manifest (openclaw.plugin.json)

```json
{
  "name": "mandate",
  "version": "0.1.0",
  "description": "Policy-enforced spending limits via Mandate",
  "main": "dist/plugin.js",
  "tools": ["transfer", "x402Pay"]
}
```

Source: https://docs.openclaw.ai/docs/tools/plugin/
