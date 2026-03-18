# @mandate/claude-code-hook (Legacy)

> **Superseded by `packages/claude-mandate-plugin/`**: the new plugin adds stateful two-phase enforcement (PostToolUse tracking + PreToolUse gating), broader wallet coverage (Bankr CLI/API, generic MCP tools), read-vs-write classification, and 15-min validation tokens. Use `claude --plugin-dir ./packages/claude-mandate-plugin` instead.

Claude Code `PreToolUse` hook that enforces Mandate spending policies before any agent-initiated payment or transfer action executes.

## What it does

Before Claude Code runs any tool matching `Bash`, `mcp__.*transfer.*`, or `mcp__.*payment.*`, the hook inspects the tool input for payment-related keywords (`transfer`, `pay`, `send`, `0x<address>`). When a match is found it calls the Mandate `/api/validate` endpoint. If the policy returns `allowed: false` or HTTP 422, the hook blocks the tool call with a structured `{"decision":"block","reason":"..."}` response and exits with code 2. All other calls (including network errors) pass through — **fail open** to avoid breaking non-payment agent tasks.

Two delivery mechanisms are provided:

| Mode | File | Notes |
|---|---|---|
| Shell script | `mandate-hook.sh` | Zero-dependency; requires `bash`, `curl`, `jq` |
| HTTP server | `mandate-hook-server.ts` | Persistent process; lower latency on repeated calls |

---

## Installation — shell script

1. Copy the script to Claude Code's hooks directory and make it executable:

```bash
cp mandate-hook.sh ~/.claude/hooks/mandate-hook.sh
chmod +x ~/.claude/hooks/mandate-hook.sh
```

2. Add the hook to `.claude/settings.json` in your project (or `~/.claude/settings.json` for global use):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|mcp__.*transfer.*|mcp__.*payment.*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/mandate-hook.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Installation — HTTP server

Start the server once (e.g. in a tmux session or as a system service):

```bash
cd packages/hooks/claude-code
npm install
npm start          # listens on :5402
```

Register in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|mcp__.*transfer.*|mcp__.*payment.*",
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:5402/hook"
          }
        ]
      }
    ]
  }
}
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MANDATE_RUNTIME_KEY` | Yes | `""` | Bearer token for the Mandate API |
| `MANDATE_API_URL` | No | `http://localhost:8000` | Base URL of the Mandate API |

Export them before starting Claude Code or the hook server:

```bash
export MANDATE_RUNTIME_KEY="your-runtime-key"
export MANDATE_API_URL="https://your-mandate-instance.example.com"
```

---

## Smoke test

Verify the shell script blocks correctly without a live API (simulates a 422 response via a mock):

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"transfer 10 USDC to 0xDead"}}' \
  | MANDATE_API_URL="http://localhost:9999" MANDATE_RUNTIME_KEY="test" \
    bash mandate-hook.sh; echo "exit: $?"
```

Expected output when the API is unreachable (fail-open):
```
exit: 0
```

To test blocking, point `MANDATE_API_URL` at a server that returns HTTP 422:

```bash
# Start a one-shot mock that returns 422
python3 -c "
import http.server, json
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        self.send_response(422)
        self.send_header('Content-Type','application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'blockReason':'per_tx_limit_exceeded'}).encode())
    def log_message(self, *a): pass
http.server.HTTPServer(('',9998),H).handle_request()
" &

echo '{"tool_name":"Bash","tool_input":{"command":"transfer 10 USDC to 0xDead"}}' \
  | MANDATE_API_URL="http://localhost:9998" MANDATE_RUNTIME_KEY="test" \
    bash mandate-hook.sh; echo "exit: $?"
```

Expected:
```
{"decision":"block","reason":"per_tx_limit_exceeded"}exit: 2
```

---

## Running tests

```bash
npm test
```

Tests cover the core intercept-decision logic (tool name regex + keyword regex) without requiring a live Mandate instance.
