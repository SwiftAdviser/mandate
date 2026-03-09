# Claude Code Hooks Reference

Claude Code supports **hooks**, which are automated actions that execute at specific lifecycle points.

## Core Concept

Hooks are user-defined shell commands, HTTP endpoints, or LLM prompts that execute automatically at specific points in Claude Code's lifecycle.

## Hook Types

1. **Command hooks** — Execute shell scripts receiving JSON via stdin
2. **HTTP hooks** — Send POST requests to endpoints
3. **Prompt hooks** — Use LLM evaluation for decisions
4. **Agent hooks** — Spawn subagents with tool access for verification

## Key Events

- `SessionStart/SessionEnd` — Session boundaries
- `UserPromptSubmit` — Before processing user input
- `PreToolUse/PostToolUse` — Before/after tool execution
- `PermissionRequest` — Permission dialog handling
- `Stop/SubagentStop` — When agents finish
- `ConfigChange` — Configuration modifications

## Configuration Locations

- `~/.claude/settings.json` (user-wide)
- `.claude/settings.json` (project-specific)
- Plugin `hooks/hooks.json`

## Decision Control

- **Exit codes**: 0 for success, 2 for blocking
- **JSON output** with structured decisions
- **Matchers** to filter by tool name or event type

## PreToolUse Hook (Command Type)

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|mcp__.*transfer.*|mcp__.*payment.*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/hooks/mandate-hook.sh"
      }]
    }]
  }
}
```

stdin JSON shape:
```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "transfer 100 USDC to 0x..." }
}
```

To block: print JSON `{"decision":"block","reason":"..."}` and exit 2.
To allow: exit 0 (no output needed).

## Advanced Features

- **Async hooks** — Run background tasks without blocking
- **MCP tool matching** — Support for Model Context Protocol tools
- **Environment persistence** — `CLAUDE_ENV_FILE` for SessionStart hooks

Source: https://docs.anthropic.com/en/docs/claude-code/hooks
