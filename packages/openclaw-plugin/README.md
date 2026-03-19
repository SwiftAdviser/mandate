# @mandate.md/openclaw-plugin

Policy gatekeeper for AI agent wallets. Validates spending limits, allowlists, and schedules before every financial action.

## Install

```bash
openclaw plugins install @mandate.md/openclaw-plugin
```

## Setup (required after install)

### Step 1: Register with Mandate

The agent must call `mandate_register` with its name and wallet address:

```
mandate_register name="MyAgent" evmAddress="0xYourWalletAddress"
```

This returns:
- `runtimeKey`: saved automatically to `~/.mandate/runtime-key`
- `claimUrl`: **show this to the wallet owner** so they can configure spending limits

### Step 2: Validate before every transaction

Before any transfer, swap, send, buy, sell, bridge, stake, or bet:

```
mandate_validate action="transfer" amount="10" to="0xRecipient" token="USDC" reason="Payment for services"
```

- `allowed: true`: proceed with your wallet (Locus, Bankr, etc.)
- `blocked: true`: do NOT proceed, show reason to user

### Step 3: Check status (optional)

```
mandate_status intentId="..."
```

## Tools

| Tool | When | What |
|------|------|------|
| `mandate_register` | Once after install | Get runtimeKey + claimUrl |
| `mandate_validate` | Before EVERY financial action | Pre-flight policy check |
| `mandate_status` | After validate | Check intent status |

## How it works

- No private key needed. Mandate is a policy layer, not a wallet.
- After validation passes, use your normal wallet (Locus, Bankr, Sponge, etc.)
- Default policy: $100/tx, $1000/day. Owner adjusts at app.mandate.md
- Safety net hook auto-intercepts financial tool calls even if you forget mandate_validate

## Config

runtimeKey is stored in `~/.mandate/runtime-key` (created by mandate_register).
Can also be set in OpenClaw config: `plugins.entries.openclaw-plugin.config.runtimeKey`.
