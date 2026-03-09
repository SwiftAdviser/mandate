#!/usr/bin/env bash
# Mandate PreToolUse hook for Claude Code
# Reads stdin JSON: {"tool_name":"Bash","tool_input":{"command":"..."}}
# Blocks payment-related tool calls that fail Mandate policy validation.

set -euo pipefail

MANDATE_API_URL="${MANDATE_API_URL:-http://localhost:8000}"
MANDATE_RUNTIME_KEY="${MANDATE_RUNTIME_KEY:-}"

PAYMENT_TOOL_PATTERN='^(Bash|mcp__.*transfer.*|mcp__.*payment.*)$'
PAYMENT_KEYWORD_PATTERN='(transfer|pay|send|0x[0-9a-fA-F]{1,40})'

# Read full stdin
INPUT="$(cat)"

# Parse fields
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')"
TOOL_INPUT_STR="$(printf '%s' "$INPUT" | jq -c '.tool_input // {}')"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"

# Check tool name pattern
if ! echo "$TOOL_NAME" | grep -qiE "$PAYMENT_TOOL_PATTERN"; then
  exit 0
fi

# Check for payment keywords in command or tool_input JSON
SEARCH_TARGET="${COMMAND}${TOOL_INPUT_STR}"
if ! echo "$SEARCH_TARGET" | grep -qiE "$PAYMENT_KEYWORD_PATTERN"; then
  exit 0
fi

# Build minimal validate payload
PAYLOAD='{
  "chainId": 84532,
  "to": "0x0000000000000000000000000000000000000000",
  "calldata": "0x",
  "valueWei": "0",
  "gasLimit": "100000",
  "maxFeePerGas": "1000000000",
  "maxPriorityFeePerGas": "1000000000",
  "nonce": 0,
  "txType": 2,
  "accessList": [],
  "intentHash": "0x0000000000000000000000000000000000000000000000000000000000000000"
}'

# POST to Mandate validate endpoint — write body and code to separate temp files
_TMP_BODY="$(mktemp)"
_TMP_CODE="$(mktemp)"
curl -s \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${MANDATE_RUNTIME_KEY}" \
  -d "$PAYLOAD" \
  -o "$_TMP_BODY" \
  -w '%{http_code}' \
  "${MANDATE_API_URL}/api/validate" > "$_TMP_CODE" 2>/dev/null || true

HTTP_BODY="$(cat "$_TMP_BODY")"
HTTP_CODE="$(cat "$_TMP_CODE")"
rm -f "$_TMP_BODY" "$_TMP_CODE"

# Evaluate response
if [ "$HTTP_CODE" = "422" ] || [ "$HTTP_CODE" = "403" ]; then
  BLOCK_REASON="$(printf '%s' "$HTTP_BODY" | jq -r '.blockReason // "policy_blocked"' 2>/dev/null || echo 'policy_blocked')"
  printf '{"decision":"block","reason":"%s"}' "$BLOCK_REASON"
  exit 2
fi

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  ALLOWED="$(printf '%s' "$HTTP_BODY" | jq -r '.allowed // true' 2>/dev/null || echo 'true')"
  if [ "$ALLOWED" = "false" ]; then
    BLOCK_REASON="$(printf '%s' "$HTTP_BODY" | jq -r '.blockReason // "policy_blocked"' 2>/dev/null || echo 'policy_blocked')"
    printf '{"decision":"block","reason":"%s"}' "$BLOCK_REASON"
    exit 2
  fi
fi

# Allow (also fail-open on network errors)
exit 0
