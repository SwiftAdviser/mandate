<p align="center">
  <img src="https://app.mandate.md/hackathon/cover.png" alt="Mandate. See why your agent spends. Stop it when it shouldn't." width="100%" />
</p>

# Mandate Plugin for Claude Code

See why your agent spends. Stop it when it shouldn't.

## Install

```
/plugin marketplace add SwiftAdviser/claude-mandate-plugin
/plugin install mandate@mandate
```

Register your agent:

```bash
npx @mandate.md/cli login --name "MyAgent"
```

Claim at the printed URL, set policies at [app.mandate.md](https://app.mandate.md).

## How it works

Every transaction requires a `reason`. Mandate reads that reason and decides: approve, block, or escalate.

```
Agent calls: mandate validate --action transfer --amount 490 --to 0x7a3f --reason "Urgent family transfer. Send immediately."

Mandate sees: "Urgent" + "immediately" + new address + no reputation.
Result: BLOCKED. Counter-evidence sent. Agent stands down.
```

On-chain session keys see `{to, value, calldata}`. Mandate sees the **why**: the attack surface nobody else is watching.

## What you get

**Intent-aware decisions.** Not just amount checks. Mandate evaluates the reasoning behind every transaction: prompt injection patterns, urgency pressure, vague justifications, unknown recipients.

**Audit trail.** Every intent logged with WHO, WHAT, WHEN, HOW MUCH, and WHY. Full history in the dashboard.

**Human-in-the-loop.** Transactions above your threshold go to Telegram or the dashboard. You see full context, approve or reject in seconds.

**Self-learning rules.** Approve a transfer? "Add this address to your allowlist." Reject vague reasoning? "Block transactions with reasons under 20 characters." Your policy evolves from your decisions.

## What the plugin enforces

The plugin gates every financial tool call in Claude Code. No valid Mandate token, no transaction.

- Agent calls `mandate validate` with action + reason
- Mandate evaluates against your spend limits, allowlists, MANDATE.md rules, and reason analysis
- If allowed: plugin records a 15-minute token, transaction proceeds
- If blocked: agent gets counter-evidence explaining why, stops voluntarily
- If no validation attempted: plugin blocks the tool call entirely

Works with any wallet Claude can access: Bankr, MCP payment tools, direct RPC calls, custom CLIs.

## Auto-scan

On every session start, the plugin scans your project for wallet calls and reports what it finds. No extra commands needed.

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Docs](https://mandate.md)
- [GitHub](https://github.com/SwiftAdviser/claude-mandate-plugin)
