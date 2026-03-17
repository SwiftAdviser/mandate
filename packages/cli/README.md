# @mandate.md/cli

The non-custodial CLI for agent wallets. Validate transactions against spend limits, allowlists, and approval workflows — your private key never leaves your machine.

Built with [incur](https://github.com/wevm/incur). Agents discover commands via `--llms`, not by reading docs.

## Install

```bash
bun add -g @mandate.md/cli
```

Or run without installing:

```bash
npx @mandate.md/cli --help
```

## Why a CLI?

An agent given SKILL.md + a runtime key will parse the docs, set up credentials — then call the wallet directly, skipping validation. Because docs are suggestions.

A CLI is an interface. There's no `mandate send`. The only path is:

```
mandate validate → agent signs locally → mandate event
```

The enforcement is structural.

## Flow

```
mandate login        Register agent, get runtimeKey
         ↓
mandate validate     Policy check (intentHash computed for you)
         ↓
   agent signs       Private key stays local
         ↓
mandate event        Post txHash for envelope verification
         ↓
mandate status       Poll until confirmed
```

## Commands

### Register

```bash
mandate login --name "MyAgent" --address 0x1234...
```

Stores credentials in `~/.mandate/credentials.json` (chmod 600). Prints `claimUrl` for the human owner to link the agent to their dashboard.

### Validate a raw transaction

```bash
mandate validate \
  --to 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  --calldata 0xa9059cbb... \
  --nonce 42 \
  --gas-limit 90000 \
  --max-fee-per-gas 1000000000 \
  --max-priority-fee-per-gas 1000000000 \
  --reason "Invoice #127 from Alice"
```

The CLI computes `intentHash` internally. You never touch keccak256.

### ERC20 transfer (high-level)

```bash
mandate transfer \
  --to 0xAlice \
  --amount 10000000 \
  --token 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  --reason "Invoice #127" \
  --nonce 42 \
  --max-fee-per-gas 1000000000 \
  --max-priority-fee-per-gas 1000000000
```

Encodes calldata, estimates gas, validates, returns unsigned tx params ready to sign.

### Post broadcast

```bash
mandate event <intentId> --tx-hash 0xabc...
mandate status <intentId>
```

### Wait for approval

```bash
mandate approve <intentId> --timeout 3600
```

Polls until the owner approves or rejects.

### Other commands

```bash
mandate activate 0x1234...   # Set wallet address post-registration
mandate whoami               # Verify credentials
```

## Agent Discovery

```bash
mandate --llms          # Machine-readable command manifest
mandate --llms-full     # Full manifest with schemas
mandate validate --schema   # JSON Schema for a specific command
```

Agents call `mandate --llms` to discover available commands. Each response includes a `next` field pointing to the logical next step — agents can't get lost.

## What about swaps, bridges, deploys?

Mandate validates **transactions**, not strategies. Every on-chain action is an EVM transaction with `{to, calldata, value}`.

| Operation | Command |
|-----------|---------|
| ERC20 transfer | `mandate transfer` |
| Swap | Build calldata yourself, then `mandate validate` |
| Deploy | Build deploy tx, then `mandate validate` |
| DCA / TWAP | Each tick is a separate `mandate validate` → sign → `mandate event` |

Mandate doesn't need to understand WHAT the tx does. It validates against policies: amount, recipient, selector, gas, schedule, quotas.

## MCP Server

```bash
mandate --mcp    # Start as MCP stdio server
```

## Links

- [SKILL.md](https://app.mandate.md/SKILL.md) — Full API reference for AI agents
- [Dashboard](https://app.mandate.md/dashboard) — Configure policies
- [@mandate.md/sdk](https://www.npmjs.com/package/@mandate.md/sdk) — TypeScript SDK for programmatic use
- [GitHub](https://github.com/SwiftAdviser/mandate)
