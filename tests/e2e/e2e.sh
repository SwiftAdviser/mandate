#!/usr/bin/env bash
# Mandate E2E Test Suite
# Usage: BASE_URL=http://localhost:8000 bash tests/e2e/e2e.sh
# Requires: curl, jq

set -euo pipefail

BASE="${BASE_URL:-http://localhost:8000}"
PASS=0; FAIL=0

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RESET='\033[0m'

pass() { echo -e "${GREEN}✓${RESET} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}✗${RESET} $1"; FAIL=$((FAIL + 1)); }
section() { echo -e "\n${YELLOW}── $1 ──${RESET}"; }

assert_status() {
  local label="$1" got="$2" want="$3"
  [ "$got" = "$want" ] && pass "$label (HTTP $want)" || fail "$label — expected HTTP $want, got HTTP $got"
}

assert_field() {
  local label="$1" body="$2" field="$3" want="$4"
  local got; got=$(echo "$body" | jq -r "$field" 2>/dev/null)
  [ "$got" = "$want" ] && pass "$label ($field=$want)" || fail "$label — expected $field=$want, got $field=$got"
}

assert_not_empty() {
  local label="$1" body="$2" field="$3"
  local got; got=$(echo "$body" | jq -r "$field" 2>/dev/null)
  [ -n "$got" ] && [ "$got" != "null" ] && pass "$label ($field present)" || fail "$label — $field is null/empty"
}

api() {
  # api METHOD path [body] [extra_headers...]
  local method="$1" path="$2" body="${3:-}" headers=()
  shift 3 || shift $#
  [ -n "$RUNTIME_KEY" ] && headers+=(-H "Authorization: Bearer $RUNTIME_KEY")
  for h in "$@"; do headers+=(-H "$h"); done

  if [ -n "$body" ]; then
    curl -s -w '\n%{http_code}' -X "$method" "$BASE$path" \
      -H "Content-Type: application/json" "${headers[@]+"${headers[@]}"}" -d "$body"
  else
    curl -s -w '\n%{http_code}' -X "$method" "$BASE$path" "${headers[@]+"${headers[@]}"}"
  fi
}

split() {
  STATUS=$(printf '%s' "$1" | tail -n 1)
  BODY=$(printf '%s' "$1" | sed '$d')
}

EVM_ADDR="0x$(openssl rand -hex 20)"
RUNTIME_KEY=""

# ══════════════════════════════════════════════════════════════════════════════
section "1. Health check"
# ══════════════════════════════════════════════════════════════════════════════

split "$(api GET /up)"
assert_status "GET /up" "$STATUS" "200"

# ══════════════════════════════════════════════════════════════════════════════
section "2. Registration"
# ══════════════════════════════════════════════════════════════════════════════

# 2a. Valid registration
split "$(api POST /api/agents/register '{"name":"E2EAgent","evmAddress":"'"$EVM_ADDR"'","chainId":84532}' '')"
assert_status "2a Register" "$STATUS" "201"
assert_not_empty "2a agentId"   "$BODY" ".agentId"
assert_not_empty "2a runtimeKey" "$BODY" ".runtimeKey"
assert_not_empty "2a claimUrl"  "$BODY" ".claimUrl"
AGENT_ID=$(echo "$BODY" | jq -r '.agentId')
RUNTIME_KEY=$(echo "$BODY" | jq -r '.runtimeKey')
CLAIM_CODE=$(echo "$BODY" | jq -r '.claimUrl' | grep -o '[A-Z0-9]\{12\}' | head -1)

# 2b. Missing evmAddress → 422
split "$(api POST /api/agents/register '{"name":"Bad","chainId":84532}' '')"
assert_status "2b Missing evmAddress" "$STATUS" "422"

# 2c. Invalid evmAddress → 422
split "$(api POST /api/agents/register '{"name":"Bad","evmAddress":"notanaddress","chainId":84532}' '')"
assert_status "2c Invalid evmAddress" "$STATUS" "422"

# ══════════════════════════════════════════════════════════════════════════════
section "3. Auth enforcement"
# ══════════════════════════════════════════════════════════════════════════════

# 3a. No auth header
SAVED_KEY="$RUNTIME_KEY"
RUNTIME_KEY=""
split "$(api POST /api/validate '{"chainId":84532,"nonce":0,"to":"0x1234567890123456789012345678901234567890","calldata":"0x","valueWei":"0","gasLimit":"21000","maxFeePerGas":"1000000000","maxPriorityFeePerGas":"1000000000","intentHash":"0x'"$(openssl rand -hex 32)"'"}' '')"
assert_status "3a No auth" "$STATUS" "401"
RUNTIME_KEY="$SAVED_KEY"

# 3b. Wrong key
RUNTIME_KEY="mndt_test_wrongkeyxxxxxxxxxxxxxxxxxxxxxx"
split "$(api POST /api/validate '{"chainId":84532}' '')"
assert_status "3b Wrong key" "$STATUS" "401"
RUNTIME_KEY="$SAVED_KEY"

# ══════════════════════════════════════════════════════════════════════════════
section "4. Validate — happy path (approve-only calldata, no spend)"
# ══════════════════════════════════════════════════════════════════════════════

# Use approve calldata (selector 0x095ea7b3 — not spend-bearing, skips price oracle + limits)
APPROVE_CALLDATA="0x095ea7b3000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680"
INTENT_HASH="0x$(openssl rand -hex 32)"

VALIDATE_BODY='{"chainId":84532,"nonce":0,"to":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","calldata":"'"$APPROVE_CALLDATA"'","valueWei":"0","gasLimit":"100000","maxFeePerGas":"1000000000","maxPriorityFeePerGas":"1000000000","intentHash":"'"$INTENT_HASH"'"}'

split "$(api POST /api/validate "$VALIDATE_BODY")"
assert_status "4a Validate allowed" "$STATUS" "200"
assert_field   "4a allowed=true" "$BODY" ".allowed" "true"
assert_not_empty "4a intentId" "$BODY" ".intentId"
INTENT_ID=$(echo "$BODY" | jq -r '.intentId')

# 4b. Same intentHash → same intentId (idempotent)
split "$(api POST /api/validate "$VALIDATE_BODY")"
assert_status "4b Duplicate hash" "$STATUS" "200"
GOT_ID=$(echo "$BODY" | jq -r '.intentId')
[ "$GOT_ID" = "$INTENT_ID" ] && pass "4b Same intentId returned" || fail "4b Idempotent — expected $INTENT_ID, got $GOT_ID"

# ══════════════════════════════════════════════════════════════════════════════
section "5. Intent lifecycle"
# ══════════════════════════════════════════════════════════════════════════════

# 5a. GET /status → reserved
split "$(api GET /api/intents/$INTENT_ID/status)"
assert_status "5a GET status" "$STATUS" "200"
assert_field  "5a status=reserved" "$BODY" ".status" "reserved"
assert_field  "5a intentId matches" "$BODY" ".intentId" "$INTENT_ID"

# 5b. POST event → broadcasted
FAKE_TX="0x$(openssl rand -hex 32)"
split "$(api POST /api/intents/$INTENT_ID/events '{"txHash":"'"$FAKE_TX"'"}')"
assert_status "5b POST event" "$STATUS" "200"
assert_field  "5b status=broadcasted" "$BODY" ".status" "broadcasted"

# 5c. POST event again → 409 (already broadcasted)
split "$(api POST /api/intents/$INTENT_ID/events '{"txHash":"'"$FAKE_TX"'"}')"
assert_status "5c Double event" "$STATUS" "409"

# 5d. GET /status → broadcasted
split "$(api GET /api/intents/$INTENT_ID/status)"
assert_status "5d GET status after event" "$STATUS" "200"
assert_field  "5d status=broadcasted" "$BODY" ".status" "broadcasted"

# 5e. Non-existent intent
split "$(api GET /api/intents/00000000-0000-0000-0000-000000000000/status)"
assert_status "5e Non-existent intent" "$STATUS" "404"

# ══════════════════════════════════════════════════════════════════════════════
section "6. Circuit breaker"
# ══════════════════════════════════════════════════════════════════════════════

# 6a. Trip CB via admin endpoint (bypass Privy auth in test — use withoutMiddleware equivalent)
# We hit the endpoint; it requires Privy JWT so will 401 without one.
# We test the 401 itself as the CB admin endpoint auth enforcement.
split "$(api POST /api/agents/$AGENT_ID/circuit-break '{"active":true}')"
assert_status "6a CB admin requires auth" "$STATUS" "401"

# ══════════════════════════════════════════════════════════════════════════════
section "7. Claim URL"
# ══════════════════════════════════════════════════════════════════════════════

if [ -n "$CLAIM_CODE" ]; then
  split "$(api GET /claim?code=$CLAIM_CODE '')"
  assert_status "7a Claim page" "$STATUS" "200"
else
  echo -e "${YELLOW}⚠${RESET} 7a Skipped — could not extract claim code"
fi

# 7b. Invalid claim code
split "$(api GET /claim?code=BADCODE000000 '')"
# Should return 200 (Inertia page renders with error state, not HTTP 404)
assert_status "7b Invalid claim code" "$STATUS" "200"

# ══════════════════════════════════════════════════════════════════════════════
section "8. Registration: per-tx spend limit enforcement"
# ══════════════════════════════════════════════════════════════════════════════

# Register a new agent with $0.01 per-tx limit
EVM2="0x$(openssl rand -hex 20)"
split "$(api POST /api/agents/register '{"name":"TightAgent","evmAddress":"'"$EVM2"'","chainId":84532,"defaultPolicy":{"spendLimitPerTxUsd":0.01}}' '')"
assert_status "8a Tight agent register" "$STATUS" "201"
TIGHT_KEY=$(echo "$BODY" | jq -r '.runtimeKey')
TIGHT_AGENT_ID=$(echo "$BODY" | jq -r '.agentId')

# Approve calldata — not spend-bearing → should still pass (approve is exempt)
SAVED_KEY="$RUNTIME_KEY"; RUNTIME_KEY="$TIGHT_KEY"
HASH2="0x$(openssl rand -hex 32)"
split "$(api POST /api/validate '{"chainId":84532,"nonce":0,"to":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","calldata":"'"$APPROVE_CALLDATA"'","valueWei":"0","gasLimit":"100000","maxFeePerGas":"1000000000","maxPriorityFeePerGas":"1000000000","intentHash":"'"$HASH2"'"}' '')"
assert_status "8b Approve exempt from spend limit" "$STATUS" "200"
RUNTIME_KEY="$SAVED_KEY"

# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${RESET}, ${RED}$FAIL failed${RESET}"
echo "══════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
