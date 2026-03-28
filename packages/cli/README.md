# @mandate.md/cli

Policy guardrails for agent wallets, from the command line. Zero install.

```bash
npx @mandate.md/cli <command>
```

## Commands

### Scan for unprotected calls

Detect wallet calls in your codebase that bypass Mandate:

```bash
npx @mandate.md/cli scan
```

Scans the current directory by default. Pass a path to scan a specific folder:

```bash
npx @mandate.md/cli scan ./src
```

### Register

```bash
npx @mandate.md/cli login --name "MyAgent"
```

Stores credentials in `~/.mandate/credentials.json`. Prints `claimUrl` for the owner to link the agent to their dashboard.

### Validate (preflight, recommended)

Action-based validation. No gas params, no intentHash.

```bash
npx @mandate.md/cli validate \
  --action transfer \
  --amount 10 \
  --to 0xRecipient \
  --token USDC \
  --reason "Invoice #127"
```

### Transfer

ERC20 transfer with policy enforcement:

```bash
npx @mandate.md/cli transfer \
  --to 0xAlice \
  --amount 10 \
  --reason "Invoice #127"
```

### Status

```bash
npx @mandate.md/cli status <intentId>
```

### Other

```bash
npx @mandate.md/cli whoami          # Verify credentials
npx @mandate.md/cli approve <id>    # Wait for human approval
npx @mandate.md/cli activate 0x...  # Set wallet address post-registration
```

> The `--raw` flag is available on `validate` for legacy EVM validation with full gas params and intentHash computation.

## Agent Discovery

```bash
npx @mandate.md/cli --llms          # Machine-readable command manifest
npx @mandate.md/cli --llms-full     # Full manifest with schemas
```

Agents call `--llms` to discover commands. Each response includes a `next` field pointing to the logical next step.

## MCP Server

```bash
npx @mandate.md/cli --mcp    # Start as MCP stdio server
```

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Documentation](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
