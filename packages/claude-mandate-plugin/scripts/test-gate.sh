#!/usr/bin/env bash
# Test suite for pre-tool-gate.sh and post-validate-track.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GATE="$SCRIPT_DIR/pre-tool-gate.sh"
TRACKER="$SCRIPT_DIR/post-validate-track.sh"
TEST_DIR="$(mktemp -d)"
PASS=0
FAIL=0

cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

reset_state() {
  echo '{"validations":[]}' > "$TEST_DIR/validation-state.json"
}

run_gate() {
  local input="$1"
  local expected_exit="$2"
  local label="$3"

  reset_state
  # If a 4th arg is provided, use it as the state file content
  if [ "${4:-}" != "" ]; then
    echo "$4" > "$TEST_DIR/validation-state.json"
  fi

  set +e
  OUTPUT="$(printf '%s' "$input" | CLAUDE_PLUGIN_DATA="$TEST_DIR" bash "$GATE" 2>&1)"
  ACTUAL_EXIT=$?
  set -e

  if [ "$ACTUAL_EXIT" -eq "$expected_exit" ]; then
    printf "  PASS: %s (exit %d)\n" "$label" "$ACTUAL_EXIT"
    PASS=$((PASS + 1))
  else
    printf "  FAIL: %s (expected exit %d, got %d)\n" "$label" "$expected_exit" "$ACTUAL_EXIT"
    printf "    output: %s\n" "$OUTPUT"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== PreToolUse Gate Tests ==="

# 1. DENY: bankr swap without validation
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr prompt \"Swap 0.1 ETH for USDC\""}}' \
  2 "bankr swap without validation"

# 2. ALLOW: bankr balance check (read-only)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr prompt \"What is my ETH balance?\""}}' \
  0 "bankr balance check (read-only)"

# 3. DENY: curl to agent/submit without validation
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"curl -X POST api.bankr.bot/agent/submit -d \"{}\""}}' \
  2 "curl agent/submit without validation"

# 4. ALLOW: mandate validate command (exclusion)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"mandate validate --to 0xAbc --reason \"test\""}}' \
  0 "mandate validate command (exclusion)"

# 5. ALLOW: bankr swap AFTER validation recorded
NOW="$(date +%s)"
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr prompt \"Swap 0.1 ETH for USDC\""}}' \
  0 "bankr swap with valid token" \
  "{\"validations\":[{\"intentId\":\"x\",\"timestamp\":${NOW},\"allowed\":true}]}"

# 6. DENY: expired validation (>15 min old)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr prompt \"Swap 0.1 ETH\""}}' \
  2 "expired validation (>15 min)" \
  '{"validations":[{"intentId":"x","timestamp":1000000000,"allowed":true}]}'

# 7. ALLOW: ls -la (not financial)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' \
  0 "ls -la (not financial)"

# 8. ALLOW: git status
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"git status"}}' \
  0 "git status (not financial)"

# 9. ALLOW: mcp read tool
run_gate \
  '{"tool_name":"mcp__bankr__get_balance","tool_input":{}}' \
  0 "mcp read tool (get_balance)"

# 10. DENY: mcp swap tool without validation
run_gate \
  '{"tool_name":"mcp__wallet__swap_tokens","tool_input":{}}' \
  2 "mcp swap tool without validation"

# 11. DENY: bankr sign command
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr sign --data 0xabc"}}' \
  2 "bankr sign without validation"

# 12. ALLOW: bankr whoami (excluded)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr whoami"}}' \
  0 "bankr whoami (excluded)"

# 13. DENY: curl to paysponge API
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"curl -X POST api.wallet.paysponge.com/api/transfers/evm -d \"{}\""}}' \
  2 "curl paysponge without validation"

# 14. DENY: generic transfer with 0x address
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"transfer 100 USDC to 0x036CbD53842c5426634e7929541eC2318f3dCF7e"}}' \
  2 "generic transfer with eth address"

# 15. ALLOW: bankr prompt with read-only query
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr prompt \"Show my portfolio\""}}' \
  0 "bankr prompt read-only (portfolio)"

# 16. DENY: bankr prompt "buy ETH"
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"bankr prompt \"Buy 1 ETH\""}}' \
  2 "bankr prompt buy ETH"

# 17. ALLOW: mcp list tool
run_gate \
  '{"tool_name":"mcp__wallet__list_transactions","tool_input":{}}' \
  0 "mcp list tool"

# 18. ALLOW: mandate status (exclusion)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"mandate status abc123"}}' \
  0 "mandate status (exclusion)"

# 19. DENY: bankr prompt via API with swap
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"curl -X POST api.bankr.bot/agent/prompt -d \"{\\\"prompt\\\":\\\"swap ETH for USDC\\\"}\""}}' \
  2 "bankr API prompt with swap"

# 20. ALLOW: curl to random API (not wallet)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"curl https://api.github.com/repos/test"}}' \
  0 "curl to non-wallet API"

# 21. ALLOW: mandate preflight command (exclusion)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"mandate preflight --action swap --reason \"Swap ETH\""}}' \
  0 "mandate preflight command (exclusion)"

# 22. ALLOW: curl to /api/validate/preflight (exclusion)
run_gate \
  '{"tool_name":"Bash","tool_input":{"command":"curl -X POST https://app.mandate.md/api/validate/preflight -d \"{}\""}}' \
  0 "curl preflight endpoint (exclusion)"

# 23. ALLOW: mcp mandate preflight tool (exclusion)
run_gate \
  '{"tool_name":"mcp__mandate__preflight","tool_input":{"action":"swap","reason":"test"}}' \
  0 "mcp mandate preflight tool (exclusion)"

echo ""
echo "=== PostToolUse Tracker Tests ==="

# Helper: build tracker input JSON with jq to handle escaping
build_tracker_input() {
  local tool_name="$1" command="$2" response="$3"
  jq -n --arg tn "$tool_name" --arg cmd "$command" --arg resp "$response" \
    '{tool_name: $tn, tool_input: {command: $cmd}, tool_response: $resp}'
}

# Test tracker: successful validate
reset_state
build_tracker_input "Bash" "mandate validate --to 0xAbc" '{ "allowed": true, "intentId": "int_abc123" }' | \
  CLAUDE_PLUGIN_DATA="$TEST_DIR" bash "$TRACKER" 2>&1
STATE="$(cat "$TEST_DIR/validation-state.json")"
COUNT="$(printf '%s' "$STATE" | jq '.validations | length')"
if [ "$COUNT" -eq 1 ]; then
  printf "  PASS: tracker records validation (count=%d)\n" "$COUNT"
  PASS=$((PASS + 1))
else
  printf "  FAIL: tracker should record 1 validation, got %d\n" "$COUNT"
  FAIL=$((FAIL + 1))
fi

# Test tracker: non-validate command (should not record)
reset_state
build_tracker_input "Bash" "ls -la" "total 0" | \
  CLAUDE_PLUGIN_DATA="$TEST_DIR" bash "$TRACKER" 2>&1
STATE="$(cat "$TEST_DIR/validation-state.json")"
COUNT="$(printf '%s' "$STATE" | jq '.validations | length')"
if [ "$COUNT" -eq 0 ]; then
  printf "  PASS: tracker ignores non-validate (count=%d)\n" "$COUNT"
  PASS=$((PASS + 1))
else
  printf "  FAIL: tracker should ignore non-validate, got count=%d\n" "$COUNT"
  FAIL=$((FAIL + 1))
fi

# Test tracker: failed validate (no allowed:true) should not record
reset_state
build_tracker_input "Bash" "mandate validate --to 0xAbc" '{ "allowed": false, "blockReason": "per_tx_limit_exceeded" }' | \
  CLAUDE_PLUGIN_DATA="$TEST_DIR" bash "$TRACKER" 2>&1
STATE="$(cat "$TEST_DIR/validation-state.json")"
COUNT="$(printf '%s' "$STATE" | jq '.validations | length')"
if [ "$COUNT" -eq 0 ]; then
  printf "  PASS: tracker ignores failed validate (count=%d)\n" "$COUNT"
  PASS=$((PASS + 1))
else
  printf "  FAIL: tracker should ignore failed validate, got count=%d\n" "$COUNT"
  FAIL=$((FAIL + 1))
fi

# Test tracker: successful preflight via CLI
reset_state
build_tracker_input "Bash" "mandate preflight --action swap --reason test" '{ "allowed": true, "intentId": "int_pf_001", "action": "swap" }' | \
  CLAUDE_PLUGIN_DATA="$TEST_DIR" bash "$TRACKER" 2>&1
STATE="$(cat "$TEST_DIR/validation-state.json")"
COUNT="$(printf '%s' "$STATE" | jq '.validations | length')"
if [ "$COUNT" -eq 1 ]; then
  printf "  PASS: tracker records preflight CLI (count=%d)\n" "$COUNT"
  PASS=$((PASS + 1))
else
  printf "  FAIL: tracker should record preflight CLI, got count=%d\n" "$COUNT"
  FAIL=$((FAIL + 1))
fi

# Test tracker: successful preflight via REST
reset_state
build_tracker_input "Bash" "curl -X POST https://app.mandate.md/api/validate/preflight -d {}" '{ "allowed": true, "intentId": "int_pf_002" }' | \
  CLAUDE_PLUGIN_DATA="$TEST_DIR" bash "$TRACKER" 2>&1
STATE="$(cat "$TEST_DIR/validation-state.json")"
COUNT="$(printf '%s' "$STATE" | jq '.validations | length')"
if [ "$COUNT" -eq 1 ]; then
  printf "  PASS: tracker records preflight REST (count=%d)\n" "$COUNT"
  PASS=$((PASS + 1))
else
  printf "  FAIL: tracker should record preflight REST, got count=%d\n" "$COUNT"
  FAIL=$((FAIL + 1))
fi

# Test tracker: MCP preflight tool
reset_state
jq -n '{tool_name: "mcp__mandate__preflight", tool_input: {action: "swap"}, tool_response: "{ \"allowed\": true, \"intentId\": \"int_pf_003\" }"}' | \
  CLAUDE_PLUGIN_DATA="$TEST_DIR" bash "$TRACKER" 2>&1
STATE="$(cat "$TEST_DIR/validation-state.json")"
COUNT="$(printf '%s' "$STATE" | jq '.validations | length')"
if [ "$COUNT" -eq 1 ]; then
  printf "  PASS: tracker records MCP preflight (count=%d)\n" "$COUNT"
  PASS=$((PASS + 1))
else
  printf "  FAIL: tracker should record MCP preflight, got count=%d\n" "$COUNT"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
