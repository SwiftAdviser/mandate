# Automate Workflows with Claude Code Hooks

> Source: https://code.claude.com/docs/llms.txt (full docs index)

Hooks are user-defined shell commands that execute at specific points in Claude Code's lifecycle. They provide deterministic control: format code after edits, block commands, send notifications, inject context, and enforce project rules.

## Hook Events

| Event | When it fires |
|---|---|
| `SessionStart` | Session begins or resumes |
| `UserPromptSubmit` | Prompt submitted, before Claude processes it |
| `PreToolUse` | Before a tool call executes. Can block it |
| `PermissionRequest` | When a permission dialog appears |
| `PostToolUse` | After a tool call succeeds |
| `PostToolUseFailure` | After a tool call fails |
| `Notification` | When Claude Code sends a notification |
| `SubagentStart` | When a subagent is spawned |
| `SubagentStop` | When a subagent finishes |
| `Stop` | When Claude finishes responding |
| `TeammateIdle` | When an agent team teammate is about to go idle |
| `TaskCompleted` | When a task is marked as completed |
| `InstructionsLoaded` | When CLAUDE.md or rules files are loaded |
| `ConfigChange` | When a configuration file changes during session |
| `WorktreeCreate` | When a worktree is being created |
| `WorktreeRemove` | When a worktree is being removed |
| `PreCompact` | Before context compaction |
| `PostCompact` | After context compaction completes |
| `Elicitation` | When MCP server requests user input |
| `ElicitationResult` | After user responds to MCP elicitation |
| `SessionEnd` | When session terminates |

## Hook Types

- `"type": "command"`: run a shell command (most common)
- `"type": "http"`: POST event data to a URL
- `"type": "prompt"`: single-turn LLM evaluation
- `"type": "agent"`: multi-turn verification with tool access

## Configuration Location

| Location | Scope | Shareable |
|---|---|---|
| `~/.claude/settings.json` | All your projects | No, local to machine |
| `.claude/settings.json` | Single project | Yes, committable |
| `.claude/settings.local.json` | Single project | No, gitignored |
| Managed policy settings | Organization-wide | Yes, admin-controlled |
| Plugin `hooks/hooks.json` | When plugin is enabled | Yes, bundled with plugin |
| Skill or agent frontmatter | While skill/agent is active | Yes, defined in component file |

## Input/Output Protocol

### Input (stdin)

Every event includes `session_id`, `cwd`, `hook_event_name`. Event-specific fields vary:

```json
{
  "session_id": "abc123",
  "cwd": "/Users/sarah/myproject",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

### Output (exit codes)

- **Exit 0**: action proceeds. Stdout added to Claude's context (for UserPromptSubmit, SessionStart)
- **Exit 2**: action blocked. Stderr becomes Claude's feedback
- **Any other exit**: action proceeds, stderr logged (visible in verbose mode via Ctrl+O)

### Structured JSON Output

Exit 0 and print JSON to stdout for more control:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use rg instead of grep for better performance"
  }
}
```

PreToolUse decisions: `"allow"`, `"deny"`, `"ask"`

Note: deny rules from settings always take precedence over hook `"allow"`.

## Matchers

Matchers are regex patterns that filter when hooks fire:

| Event | What matcher filters | Examples |
|---|---|---|
| PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest | tool name | `Bash`, `Edit\|Write`, `mcp__.*` |
| SessionStart | how session started | `startup`, `resume`, `clear`, `compact` |
| SessionEnd | why session ended | `clear`, `logout`, `prompt_input_exit` |
| Notification | notification type | `permission_prompt`, `idle_prompt` |
| SubagentStart, SubagentStop | agent type | `Bash`, `Explore`, `Plan` |
| PreCompact, PostCompact | compaction trigger | `manual`, `auto` |
| ConfigChange | config source | `user_settings`, `project_settings`, `skills` |
| UserPromptSubmit, Stop, TaskCompleted, etc. | no matcher support | always fires |

## Examples

### Desktop Notification (macOS)

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

Linux: use `notify-send 'Claude Code' 'Claude Code needs your attention'`

### Auto-Format After Edits (Prettier)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

### Block Edits to Protected Files

Script at `.claude/hooks/protect-files.sh`:

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

PROTECTED_PATTERNS=(".env" "package-lock.json" ".git/")

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2
  fi
done
exit 0
```

Hook config:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"
          }
        ]
      }
    ]
  }
}
```

### Re-inject Context After Compaction

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: use Bun, not npm. Run bun test before committing. Current sprint: auth refactor.'"
          }
        ]
      }
    ]
  }
}
```

### Audit Configuration Changes

```json
{
  "hooks": {
    "ConfigChange": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "jq -c '{timestamp: now | todate, source: .source, file: .file_path}' >> ~/claude-config-audit.log"
          }
        ]
      }
    ]
  }
}
```

### Auto-Approve ExitPlanMode

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"decision\": {\"behavior\": \"allow\"}}}'"
          }
        ]
      }
    ]
  }
}
```

With permission mode change:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedPermissions": [
        { "type": "setMode", "mode": "acceptEdits", "destination": "session" }
      ]
    }
  }
}
```

### Log Every Bash Command

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command' >> ~/.claude/command-log.txt"
          }
        ]
      }
    ]
  }
}
```

### Match MCP Tools

MCP tool naming: `mcp__<server>__<tool>` (e.g. `mcp__github__search_repositories`)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__github__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"GitHub tool called: $(jq -r '.tool_name')\" >&2"
          }
        ]
      }
    ]
  }
}
```

## Prompt-Based Hooks

For decisions requiring judgment. Uses a Claude model (Haiku by default) to return yes/no:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if all tasks are complete. If not, respond with {\"ok\": false, \"reason\": \"what remains to be done\"}."
          }
        ]
      }
    ]
  }
}
```

Specify different model with `"model"` field.

## Agent-Based Hooks

Spawns a subagent that can read files, search code, run commands:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verify that all unit tests pass. Run the test suite and check the results. $ARGUMENTS",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

Default timeout: 60s, up to 50 tool-use turns. Same `"ok"` / `"reason"` response format as prompt hooks.

## HTTP Hooks

POST event data to an endpoint:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:8080/hooks/tool-use",
            "headers": {
              "Authorization": "Bearer $MY_TOKEN"
            },
            "allowedEnvVars": ["MY_TOKEN"]
          }
        ]
      }
    ]
  }
}
```

Header values support `$VAR_NAME` interpolation. Only vars in `allowedEnvVars` are resolved.

## Troubleshooting

**Hook not firing:**
- Check `/hooks` menu for correct event listing
- Matchers are case-sensitive
- `PermissionRequest` hooks don't fire in non-interactive mode (`-p`), use `PreToolUse` instead

**Hook error in output:**
- Test manually: `echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | ./my-hook.sh && echo $?`
- Use absolute paths or `$CLAUDE_PROJECT_DIR`
- Make scripts executable: `chmod +x ./my-hook.sh`

**Stop hook infinite loop:**
Check `stop_hook_active` field and exit early:

```bash
#!/bin/bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
# ... rest of hook logic
```

**JSON validation failed:**
Shell profile `echo` statements can pollute stdout. Wrap them:

```bash
# In ~/.zshrc or ~/.bashrc
if [[ $- == *i* ]]; then
  echo "Shell ready"
fi
```

**Debug:** Toggle verbose mode with `Ctrl+O`, or run `claude --debug`.

## Key Notes

- Hook timeout: 10 minutes default, configurable per hook with `timeout` field (seconds)
- `PostToolUse` hooks cannot undo actions (tool already executed)
- `Stop` hooks fire whenever Claude finishes responding, not only at task completion
- All matching hooks run in parallel; identical commands are deduplicated
- `disableAllHooks: true` in settings disables all hooks at once
