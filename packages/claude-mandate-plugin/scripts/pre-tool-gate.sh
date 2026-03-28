#!/usr/bin/env bash
# Mandate PreToolUse gate: blocks transaction tools unless a valid Mandate
# validation token exists. Purely local file check, no network calls.
set -euo pipefail

# ── Read stdin JSON ──────────────────────────────────────────────────────────
INPUT="$(cat)"
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"

# ── Lowercase for matching ───────────────────────────────────────────────────
TOOL_LOWER="$(printf '%s' "$TOOL_NAME" | tr '[:upper:]' '[:lower:]')"
CMD_LOWER="$(printf '%s' "$COMMAND" | tr '[:upper:]' '[:lower:]')"

# ── 1. Mandate's own MCP tools: always allow ─────────────────────────────────
if printf '%s' "$TOOL_LOWER" | grep -qE '^mcp__mandate__(preflight|validate|execute|status|register|activate)'; then
  exit 0
fi

# ── 1b. MCP read tools: always allow ────────────────────────────────────────
if printf '%s' "$TOOL_LOWER" | grep -qE '^mcp__.*__(get_|list_|balance|read_|fetch_|query_|search_|describe_)'; then
  exit 0
fi

# ── 2. MCP financial tools: check state ─────────────────────────────────────
if printf '%s' "$TOOL_LOWER" | grep -qE '^mcp__.*__(transfer|send|pay|swap|trade|sell|buy|exchange|submit|sign_tx|broadcast|withdraw|deposit|bridge|execute|approve_tx)'; then
  # Fall through to state check below
  :
# ── 3. Non-Bash tools: allow everything else ────────────────────────────────
elif [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

# ── Below here: Bash commands only (or MCP financial tools) ──────────────────

# ── 4. Mandate's own commands: always allow ──────────────────────────────────
if printf '%s' "$CMD_LOWER" | grep -qE '(mandate preflight|mandate validate|mandate transfer|/api/validate/preflight|/api/validate|mandate status|mandate event|mandate login|mandate activate|mandate approve|mandate --llms)'; then
  exit 0
fi

# ── 5. Bankr read-only commands: always allow ────────────────────────────────
if printf '%s' "$CMD_LOWER" | grep -qE 'bankr (whoami|login|status|cancel|help|version)'; then
  exit 0
fi

# ── 6. Detect wallet CLI calls ──────────────────────────────────────────────
IS_TX=false

# Bankr CLI: bankr prompt / bankr submit / bankr sign
if printf '%s' "$CMD_LOWER" | grep -qE 'bankr (prompt|submit|sign)'; then
  # Bankr prompt needs read-vs-write classification
  if printf '%s' "$CMD_LOWER" | grep -qE 'bankr prompt'; then
    # Extract the prompt text (everything after "bankr prompt")
    PROMPT_TEXT="$(printf '%s' "$CMD_LOWER" | sed 's/.*bankr prompt[[:space:]]*//')"

    # Write keywords: if ANY present, treat as transaction
    if printf '%s' "$PROMPT_TEXT" | grep -qE '(swap|sell|buy|send|transfer|trade|bridge|deploy|stake|bet|approve|withdraw|deposit|execute|submit|sign|launch|mint|open position|close position)'; then
      IS_TX=true
    fi
    # If no write keywords found, it's read-only: allow
  else
    # bankr submit / bankr sign are always transactional
    IS_TX=true
  fi
fi

# Bankr API URLs
if printf '%s' "$CMD_LOWER" | grep -qE 'api\.bankr\.bot/(agent/prompt|agent/submit|agent/sign)'; then
  # For agent/prompt via API, check for write keywords in the body
  if printf '%s' "$CMD_LOWER" | grep -qE 'agent/prompt'; then
    if printf '%s' "$CMD_LOWER" | grep -qE '(swap|sell|buy|send|transfer|trade|bridge|deploy|stake|bet|approve|withdraw|deposit|execute|submit|sign|launch|mint)'; then
      IS_TX=true
    fi
  else
    IS_TX=true
  fi
fi

# Generic wallet API URLs
if printf '%s' "$CMD_LOWER" | grep -qE 'api\.wallet\.paysponge\.com'; then
  IS_TX=true
fi

# Generic: transaction keyword + ethereum address pattern
if printf '%s' "$CMD_LOWER" | grep -qE '(transfer|send|swap|trade|sell|buy|exchange|bridge|withdraw|deposit)[[:space:]]' && \
   printf '%s' "$CMD_LOWER" | grep -qE '0x[0-9a-fa-f]{40}'; then
  IS_TX=true
fi

# ── 7. Not a transaction: allow ──────────────────────────────────────────────
if [ "$IS_TX" = false ] && [ "$TOOL_NAME" = "Bash" ]; then
  exit 0
fi

# ── 8. State check: look for valid validation token ──────────────────────────
STATE_FILE="${CLAUDE_PLUGIN_DATA:-/tmp/mandate-plugin}/validation-state.json"
if [ -f "$STATE_FILE" ]; then
  NOW="$(date +%s)"
  CUTOFF=$((NOW - 900))  # 15 minutes

  # Check if any validation entry is recent and allowed
  VALID="$(jq -r --argjson cutoff "$CUTOFF" \
    '[.validations[] | select(.allowed == true and .timestamp > $cutoff)] | length' \
    "$STATE_FILE" 2>/dev/null || echo "0")"

  if [ "$VALID" -gt 0 ]; then
    exit 0
  fi
fi

# ── 9. No valid token: DENY ─────────────────────────────────────────────────
cat <<'DENY'
MANDATE POLICY GATE: Transaction blocked. You must validate with Mandate first.

Validate (recommended):
  mandate validate --action "swap" --reason "<why>" --amount "50" --to "0xAddr"

  Or REST: POST https://app.mandate.md/api/validate
  Body: { "action": "swap", "reason": "why", "amount": "50", "to": "0x..." }

Legacy raw validate (self-custodial, needs gas params + intentHash):
  mandate validate --raw --to <recipient> --calldata <data> --reason "<why>"

After validation succeeds (allowed: true), retry this tool call.
DENY
exit 2
