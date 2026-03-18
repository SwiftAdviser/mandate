#!/usr/bin/env bash
# Mandate PostToolUse tracker: records successful /validate calls
# so the PreToolUse gate can allow subsequent transaction tools.
set -euo pipefail

# ── Read stdin JSON ──────────────────────────────────────────────────────────
INPUT="$(cat)"
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"
TOOL_RESPONSE="$(printf '%s' "$INPUT" | jq -r '.tool_response // ""')"

# ── Lowercase for matching ───────────────────────────────────────────────────
CMD_LOWER="$(printf '%s' "$COMMAND" | tr '[:upper:]' '[:lower:]')"
TOOL_LOWER="$(printf '%s' "$TOOL_NAME" | tr '[:upper:]' '[:lower:]')"

# ── 1. Detect Mandate validation calls ───────────────────────────────────────
IS_VALIDATE=false

# CLI: mandate preflight / mandate validate / mandate transfer
if printf '%s' "$CMD_LOWER" | grep -qE '(mandate preflight|mandate validate|mandate transfer)'; then
  IS_VALIDATE=true
fi

# REST: curl to /api/validate/preflight or /api/validate
if printf '%s' "$CMD_LOWER" | grep -qE '(curl|fetch|http).*((/api)?/validate/preflight|/api/validate|/validate)'; then
  IS_VALIDATE=true
fi

# MCP: mandate preflight/validate/execute tools
if printf '%s' "$TOOL_LOWER" | grep -qE '^mcp__mandate__(preflight|validate|execute)'; then
  IS_VALIDATE=true
fi

if [ "$IS_VALIDATE" = false ]; then
  exit 0
fi

# ── 2. Check response for success ───────────────────────────────────────────
# Look for "allowed": true or intentId in the response
HAS_ALLOWED="$(printf '%s' "$TOOL_RESPONSE" | grep -cE '"allowed"[[:space:]]*:[[:space:]]*true' || true)"
HAS_INTENT="$(printf '%s' "$TOOL_RESPONSE" | grep -coE '"intentId"' || true)"

if [ "$HAS_ALLOWED" -eq 0 ] && [ "$HAS_INTENT" -eq 0 ]; then
  # Validation was not successful, don't record
  exit 0
fi

# ── 3. Extract intentId if present ───────────────────────────────────────────
INTENT_ID="$(printf '%s' "$TOOL_RESPONSE" | grep -oE '"intentId"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"intentId"[[:space:]]*:[[:space:]]*"//' | sed 's/"//' || echo "unknown")"
NOW="$(date +%s)"

# ── 4. Write to state file ──────────────────────────────────────────────────
STATE_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/mandate-plugin}"
STATE_FILE="$STATE_DIR/validation-state.json"
mkdir -p "$STATE_DIR"

# Read existing state or create empty
if [ -f "$STATE_FILE" ]; then
  STATE="$(cat "$STATE_FILE")"
else
  STATE='{"validations":[]}'
fi

# Prune entries older than 15 min, then append new one
CUTOFF=$((NOW - 900))
UPDATED="$(printf '%s' "$STATE" | jq --argjson cutoff "$CUTOFF" \
  --arg intentId "$INTENT_ID" \
  --argjson ts "$NOW" \
  '{validations: ([.validations[] | select(.timestamp > $cutoff)] + [{intentId: $intentId, timestamp: $ts, allowed: true}])}')"

printf '%s' "$UPDATED" > "$STATE_FILE"
exit 0
