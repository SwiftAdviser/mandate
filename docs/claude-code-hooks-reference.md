# Claude Code Hooks Reference

> Source: https://code.claude.com/docs/llms.txt
> For quickstart guide with examples, see [claude-code-hooks.md](./claude-code-hooks.md)

Complete technical reference for hook events, configuration schema, JSON I/O formats, exit codes, async hooks, HTTP hooks, prompt hooks, and agent hooks.

## Configuration Schema

Three levels of nesting:

1. **Hook event**: lifecycle point (e.g. `PreToolUse`, `Stop`)
2. **Matcher group**: regex filter for when it fires
3. **Hook handler**: shell command, HTTP endpoint, prompt, or agent that runs

### Hook Handler Types

| Type | Description |
|---|---|
| `command` | Run a shell command. Input via stdin, output via exit codes + stdout |
| `http` | POST event JSON to a URL. Results via response body |
| `prompt` | Single-turn LLM evaluation. Returns yes/no decision |
| `agent` | Multi-turn subagent with tool access (Read, Grep, Glob, etc.) |

### Common Handler Fields (all types)

| Field | Required | Description |
|---|---|---|
| `type` | yes | `"command"`, `"http"`, `"prompt"`, or `"agent"` |
| `timeout` | no | Seconds before canceling. Defaults: 600 (command), 30 (prompt), 60 (agent) |
| `statusMessage` | no | Custom spinner message while hook runs |
| `once` | no | If true, runs only once per session (skills only) |

### Command Hook Fields

| Field | Required | Description |
|---|---|---|
| `command` | yes | Shell command to execute |
| `async` | no | If true, runs in background without blocking |

### HTTP Hook Fields

| Field | Required | Description |
|---|---|---|
| `url` | yes | URL to POST to |
| `headers` | no | Key-value pairs. Values support `$VAR_NAME` interpolation |
| `allowedEnvVars` | no | List of env var names allowed for header interpolation |

### Prompt/Agent Hook Fields

| Field | Required | Description |
|---|---|---|
| `prompt` | yes | Prompt text. `$ARGUMENTS` placeholder for hook input JSON |
| `model` | no | Model to use. Defaults to fast model (Haiku) |

## Common Input Fields (all events)

| Field | Description |
|---|---|
| `session_id` | Current session identifier |
| `transcript_path` | Path to conversation JSON |
| `cwd` | Current working directory |
| `permission_mode` | `"default"`, `"plan"`, `"acceptEdits"`, `"dontAsk"`, or `"bypassPermissions"` |
| `hook_event_name` | Name of the event that fired |

Additional fields when running with `--agent` or inside a subagent:

| Field | Description |
|---|---|
| `agent_id` | Unique subagent identifier (only inside subagent) |
| `agent_type` | Agent name (e.g. `"Explore"`, `"security-reviewer"`) |

## Exit Code Protocol

- **Exit 0**: success. Stdout parsed for JSON. For UserPromptSubmit/SessionStart, stdout added to context
- **Exit 2**: blocking error. Stderr fed to Claude as feedback. Effect depends on event
- **Other exit**: non-blocking error. Stderr logged (verbose mode Ctrl+O)

### Exit Code 2 Behavior Per Event

| Event | Can block? | Effect |
|---|---|---|
| `PreToolUse` | Yes | Blocks tool call |
| `PermissionRequest` | Yes | Denies permission |
| `UserPromptSubmit` | Yes | Blocks + erases prompt |
| `Stop` | Yes | Prevents stopping, continues conversation |
| `SubagentStop` | Yes | Prevents subagent from stopping |
| `TeammateIdle` | Yes | Prevents teammate from going idle |
| `TaskCompleted` | Yes | Prevents task completion |
| `ConfigChange` | Yes | Blocks config change (except policy_settings) |
| `Elicitation` | Yes | Denies the elicitation |
| `ElicitationResult` | Yes | Blocks response (becomes decline) |
| `WorktreeCreate` | Yes | Any non-zero fails creation |
| `PostToolUse` | No | Shows stderr to Claude |
| `PostToolUseFailure` | No | Shows stderr to Claude |
| `Notification` | No | Shows stderr to user only |
| `SubagentStart` | No | Shows stderr to user only |
| `SessionStart` | No | Shows stderr to user only |
| `SessionEnd` | No | Shows stderr to user only |
| `PreCompact` | No | Shows stderr to user only |
| `PostCompact` | No | Shows stderr to user only |
| `WorktreeRemove` | No | Logged in debug mode only |
| `InstructionsLoaded` | No | Exit code ignored |

## JSON Output Fields (universal)

| Field | Default | Description |
|---|---|---|
| `continue` | true | If false, Claude stops entirely. Takes precedence over event-specific decisions |
| `stopReason` | none | Message shown to user when continue is false |
| `suppressOutput` | false | If true, hides stdout from verbose mode |
| `systemMessage` | none | Warning message shown to user |

## Decision Control Summary

| Events | Pattern | Key fields |
|---|---|---|
| UserPromptSubmit, PostToolUse, PostToolUseFailure, Stop, SubagentStop, ConfigChange | Top-level `decision` | `decision: "block"`, `reason` |
| TeammateIdle, TaskCompleted | Exit code or `continue: false` | Exit 2 blocks with stderr. JSON `{continue: false}` stops entirely |
| PreToolUse | `hookSpecificOutput` | `permissionDecision` (allow/deny/ask), `permissionDecisionReason` |
| PermissionRequest | `hookSpecificOutput` | `decision.behavior` (allow/deny) |
| WorktreeCreate | stdout path | Print absolute path to created worktree |
| Elicitation | `hookSpecificOutput` | `action` (accept/decline/cancel), `content` |
| ElicitationResult | `hookSpecificOutput` | `action` (accept/decline/cancel), `content` |
| WorktreeRemove, Notification, SessionEnd, PreCompact, PostCompact, InstructionsLoaded | None | No decision control. Side effects only |

---

## Hook Events (detailed)

### SessionStart

Fires when session begins or resumes. Only `type: "command"` supported.

**Matcher values:** `startup`, `resume`, `clear`, `compact`

**Additional input:** `source`, `model`, optional `agent_type`

**Output:** `additionalContext` via hookSpecificOutput. Stdout text added to Claude's context.

**Environment:** `CLAUDE_ENV_FILE` available for persisting env vars:

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

### InstructionsLoaded

Fires when CLAUDE.md or `.claude/rules/*.md` loaded. No matcher support. No decision control. Async/observability only.

**Additional input:**

| Field | Description |
|---|---|
| `file_path` | Absolute path to instruction file |
| `memory_type` | `"User"`, `"Project"`, `"Local"`, `"Managed"` |
| `load_reason` | `"session_start"`, `"nested_traversal"`, `"path_glob_match"`, `"include"`, `"compact"` |
| `globs` | Path glob patterns (for path_glob_match loads) |
| `trigger_file_path` | File whose access triggered this load |
| `parent_file_path` | Parent instruction file (for include loads) |

### UserPromptSubmit

Fires when user submits prompt, before Claude processes it.

**Additional input:** `prompt` (the submitted text)

**Output options:**
- Plain text stdout: added as context
- JSON `additionalContext`: added more discretely
- `decision: "block"` + `reason`: prevents prompt processing, erases it

### PreToolUse

Fires before tool call executes. Matches on tool name.

**Additional input:** `tool_name`, `tool_input`, `tool_use_id`

**Tool input schemas:**

- **Bash:** `command`, `description`, `timeout`, `run_in_background`
- **Write:** `file_path`, `content`
- **Edit:** `file_path`, `old_string`, `new_string`, `replace_all`
- **Read:** `file_path`, `offset`, `limit`
- **Glob:** `pattern`, `path`
- **Grep:** `pattern`, `path`, `glob`, `output_mode`, `-i`, `multiline`
- **WebFetch:** `url`, `prompt`
- **WebSearch:** `query`, `allowed_domains`, `blocked_domains`
- **Agent:** `prompt`, `description`, `subagent_type`, `model`

**Decision control (hookSpecificOutput):**

| Field | Description |
|---|---|
| `permissionDecision` | `"allow"` (skip prompt), `"deny"` (block), `"ask"` (prompt user) |
| `permissionDecisionReason` | For allow/ask: shown to user. For deny: shown to Claude |
| `updatedInput` | Modifies tool input before execution |
| `additionalContext` | Added to Claude's context |

Note: `"allow"` skips interactive prompt but deny/ask rules from settings still apply.

### PermissionRequest

Fires when permission dialog is about to show. Matches on tool name.

**Additional input:** `tool_name`, `tool_input`, optional `permission_suggestions`

**Decision control (hookSpecificOutput):**

| Field | Description |
|---|---|
| `decision.behavior` | `"allow"` or `"deny"` |
| `decision.updatedInput` | Modify tool input (allow only) |
| `decision.updatedPermissions` | Array of permission updates (allow only) |
| `decision.message` | Why denied (deny only) |
| `decision.interrupt` | If true, stops Claude (deny only) |

**Permission update entry types:**

| Type | Fields | Effect |
|---|---|---|
| `addRules` | `rules`, `behavior`, `destination` | Add permission rules |
| `replaceRules` | `rules`, `behavior`, `destination` | Replace all rules of given behavior |
| `removeRules` | `rules`, `behavior`, `destination` | Remove matching rules |
| `setMode` | `mode`, `destination` | Change permission mode |
| `addDirectories` | `directories`, `destination` | Add working directories |
| `removeDirectories` | `directories`, `destination` | Remove working directories |

**Destination values:** `session`, `localSettings`, `projectSettings`, `userSettings`

Note: PermissionRequest hooks don't fire in non-interactive mode (`-p`). Use PreToolUse instead.

### PostToolUse

Fires after tool completes successfully. Matches on tool name.

**Additional input:** `tool_name`, `tool_input`, `tool_response`, `tool_use_id`

**Output:** `decision: "block"` + `reason`, `additionalContext`, `updatedMCPToolOutput` (MCP tools only)

### PostToolUseFailure

Fires when tool execution fails. Matches on tool name.

**Additional input:** `tool_name`, `tool_input`, `tool_use_id`, `error`, `is_interrupt`

**Output:** `additionalContext`

### Notification

Fires when Claude Code sends notifications. Matches on type: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`.

**Additional input:** `message`, `title`, `notification_type`

**Output:** `additionalContext`. No blocking.

### SubagentStart

Fires when subagent spawned. Matches on agent type.

**Additional input:** `agent_id`, `agent_type`

**Output:** `additionalContext` (injected into subagent context). No blocking.

### SubagentStop

Fires when subagent finishes. Matches on agent type.

**Additional input:** `stop_hook_active`, `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message`

**Output:** Same as Stop: `decision: "block"` + `reason`

### Stop

Fires when main Claude agent finishes responding. No matcher support.

**Additional input:** `stop_hook_active`, `last_assistant_message`

**Output:** `decision: "block"` + `reason` (reason required when blocking)

Important: Check `stop_hook_active` to prevent infinite loops:

```bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
```

### TeammateIdle

Fires when agent team teammate about to go idle. No matcher support.

**Additional input:** `teammate_name`, `team_name`

**Output:** Exit 2 with stderr feedback, or `{continue: false, stopReason: "..."}`

### TaskCompleted

Fires when task being marked completed. No matcher support.

**Additional input:** `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name`

**Output:** Exit 2 with stderr feedback, or `{continue: false, stopReason: "..."}`

### ConfigChange

Fires when config file changes during session. Matches on source: `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`.

**Additional input:** `source`, `file_path`

**Output:** `decision: "block"` + `reason`. Note: `policy_settings` changes cannot be blocked.

### WorktreeCreate

Fires when worktree being created. No matcher. Only `type: "command"`.

**Additional input:** `name` (slug identifier)

**Output:** Must print absolute path to created worktree on stdout. Non-zero exit fails creation.

### WorktreeRemove

Fires when worktree being removed. No matcher. Only `type: "command"`.

**Additional input:** `worktree_path`

**Output:** No decision control. Failures logged in debug mode only.

### PreCompact

Fires before compaction. Matches: `manual`, `auto`.

**Additional input:** `trigger`, `custom_instructions`

### PostCompact

Fires after compaction. Matches: `manual`, `auto`.

**Additional input:** `trigger`, `compact_summary`

### Elicitation

Fires when MCP server requests user input. Matches on MCP server name.

**Additional input:** `mcp_server_name`, `message`, `mode` (form/url), `url`, `elicitation_id`, `requested_schema`

**Output (hookSpecificOutput):** `action` (accept/decline/cancel), `content` (form values for accept)

### ElicitationResult

Fires after user responds to MCP elicitation. Matches on MCP server name.

**Additional input:** `mcp_server_name`, `action`, `content`, `mode`, `elicitation_id`

**Output (hookSpecificOutput):** `action` (override), `content` (override values)

### SessionEnd

Fires when session terminates. Matches on reason: `clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`.

**Additional input:** `reason`

Default timeout: 1.5 seconds. Override with `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` env var.

---

## Prompt-Based Hooks (type: "prompt")

Send hook input + prompt to Claude model. Model returns `{ok: true/false, reason: "..."}`.

**Supported events:** PermissionRequest, PostToolUse, PostToolUseFailure, PreToolUse, Stop, SubagentStop, TaskCompleted, UserPromptSubmit

```json
{
  "type": "prompt",
  "prompt": "Evaluate if Claude should stop: $ARGUMENTS. Check if all tasks are complete.",
  "model": "haiku",
  "timeout": 30
}
```

## Agent-Based Hooks (type: "agent")

Spawns subagent with tool access (Read, Grep, Glob, etc.). Up to 50 tool-use turns. Same `{ok: true/false}` response format.

**Supported events:** Same as prompt hooks.

```json
{
  "type": "agent",
  "prompt": "Verify all unit tests pass. Run the test suite. $ARGUMENTS",
  "timeout": 120
}
```

## Async Hooks

Set `"async": true` on command hooks to run in background. Claude continues immediately.

- Only `type: "command"` supported
- Cannot block or return decisions (action already proceeded)
- Output delivered on next conversation turn via `systemMessage` or `additionalContext`
- Each execution is a separate background process (no dedup)

```json
{
  "type": "command",
  "command": "./run-tests.sh",
  "async": true,
  "timeout": 300
}
```

## Environment Variables

| Variable | Description |
|---|---|
| `$CLAUDE_PROJECT_DIR` | Project root directory |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin installation directory |
| `${CLAUDE_PLUGIN_DATA}` | Plugin persistent data directory |
| `$CLAUDE_CODE_REMOTE` | Set to `"true"` in remote web environments |
| `$CLAUDE_ENV_FILE` | File path for persisting env vars (SessionStart only) |

## Event Type Support Matrix

Events supporting all 4 hook types (command, http, prompt, agent):
- PermissionRequest, PostToolUse, PostToolUseFailure, PreToolUse, Stop, SubagentStop, TaskCompleted, UserPromptSubmit

Events supporting only `type: "command"`:
- ConfigChange, Elicitation, ElicitationResult, InstructionsLoaded, Notification, PostCompact, PreCompact, SessionEnd, SessionStart, SubagentStart, TeammateIdle, WorktreeCreate, WorktreeRemove

## Debugging

```bash
claude --debug    # Full hook execution details
# Ctrl+O          # Toggle verbose mode in session
```

## Disabling Hooks

- `"disableAllHooks": true` in settings disables all hooks
- Managed settings hierarchy: admin hooks can't be disabled by user/project settings
- No per-hook disable, only remove the entry
