#!/usr/bin/env bash
# Mandate E2E Test Suite
# Usage: BASE_URL=http://localhost:8000 bash tests/e2e/e2e.sh
# Requires: curl, jq, python3

set -uo pipefail

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

# Compute intentHash matching PolicyEngineService::computeIntentHash
# sha3_256("chainId|nonce|to|calldata|valueWei|gasLimit|maxFeePerGas|maxPriorityFeePerGas|txType|accessList")
compute_intent_hash() {
  local chain_id="$1" nonce="$2" to="$3" calldata="$4"
  local value_wei="$5" gas_limit="$6" max_fee="$7" max_priority_fee="$8"
  local tx_type="${9:-2}" access_list="${10:-[]}"
  python3 -c "
import hashlib
parts = ['$chain_id', '$nonce', '$to'.lower(), '$calldata'.lower(),
         '$value_wei', '$gas_limit', '$max_fee', '$max_priority_fee',
         '$tx_type', '$access_list']
packed = '|'.join(parts)
h = hashlib.new('sha3_256')
h.update(packed.encode())
print('0x' + h.hexdigest())
"
}

api() {
  # api METHOD path [body] [extra_headers...]
  local method="$1" path="$2" body="${3:-}" headers=()
  shift 3 || shift $#
  headers+=(-H "Accept: application/json")
  [ -n "$RUNTIME_KEY" ] && headers+=(-H "Authorization: Bearer $RUNTIME_KEY")
  for h in "$@"; do headers+=(-H "$h"); done

  if [ -n "$body" ]; then
    curl -s -w '\n%{http_code}' -X "$method" "$BASE$path" \
      -H "Content-Type: application/json" "${headers[@]}" -d "$body"
  else
    curl -s -w '\n%{http_code}' -X "$method" "$BASE$path" "${headers[@]}"
  fi
}

split() {
  STATUS=$(printf '%s' "$1" | tail -n 1)
  BODY=$(printf '%s' "$1" | sed '$d')
}

USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
APPROVE_CALLDATA="0x095ea7b3000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000989680"
EVM_ADDR="0x$(openssl rand -hex 20)"
RUNTIME_KEY=""
INTENT_ID=""

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
assert_not_empty "2a agentId"    "$BODY" ".agentId"
assert_not_empty "2a runtimeKey" "$BODY" ".runtimeKey"
assert_not_empty "2a claimUrl"   "$BODY" ".claimUrl"
AGENT_ID=$(echo "$BODY" | jq -r '.agentId')
RUNTIME_KEY=$(echo "$BODY" | jq -r '.runtimeKey')
CLAIM_CODE=$(echo "$BODY" | jq -r '.claimUrl' | grep -oE '[A-Z0-9]{8}' | tail -1) || CLAIM_CODE=""

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
split "$(api POST /api/validate '{"chainId":84532}' '')"
assert_status "3a No auth" "$STATUS" "401"
RUNTIME_KEY="$SAVED_KEY"

# 3b. Wrong key
RUNTIME_KEY="mndt_test_wrongkeyxxxxxxxxxxxxxxxxxxxxxx"
split "$(api POST /api/validate '{"chainId":84532}' '')"
assert_status "3b Wrong key" "$STATUS" "401"
RUNTIME_KEY="$SAVED_KEY"

# ══════════════════════════════════════════════════════════════════════════════
section "4. Validate — happy path (approve calldata, no spend)"
# ══════════════════════════════════════════════════════════════════════════════

INTENT_HASH=$(compute_intent_hash 84532 0 "$USDC" "$APPROVE_CALLDATA" 0 100000 1000000000 1000000000 2 "[]")

VALIDATE_BODY='{"chainId":84532,"nonce":0,"to":"'"$USDC"'","calldata":"'"$APPROVE_CALLDATA"'","valueWei":"0","gasLimit":"100000","maxFeePerGas":"1000000000","maxPriorityFeePerGas":"1000000000","txType":2,"accessList":[],"intentHash":"'"$INTENT_HASH"'"}'

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

if [ -z "$INTENT_ID" ] || [ "$INTENT_ID" = "null" ]; then
  echo -e "${YELLOW}⚠${RESET} 5a-5d Skipped — no intentId (validate failed)"
  FAIL=$((FAIL + 4))
else
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
fi

# 5e. Non-existent intent
split "$(api GET /api/intents/00000000-0000-0000-0000-000000000000/status)"
assert_status "5e Non-existent intent" "$STATUS" "404"

# ══════════════════════════════════════════════════════════════════════════════
section "6. Circuit breaker"
# ══════════════════════════════════════════════════════════════════════════════

# Admin endpoint requires Privy JWT — test that it enforces auth (401)
split "$(api POST /api/agents/$AGENT_ID/circuit-break '{"active":true}')"
assert_status "6a CB admin requires auth" "$STATUS" "401"

# ══════════════════════════════════════════════════════════════════════════════
section "7. Claim URL"
# ══════════════════════════════════════════════════════════════════════════════

if [ -n "$CLAIM_CODE" ]; then
  split "$(api GET "/claim?code=$CLAIM_CODE" '')"
  assert_status "7a Claim page" "$STATUS" "200"
else
  echo -e "${YELLOW}⚠${RESET} 7a Skipped — could not extract claim code"
fi

# 7b. Invalid claim code
split "$(api GET "/claim?code=BADCODE0" '')"
assert_status "7b Invalid claim code" "$STATUS" "200"

# ══════════════════════════════════════════════════════════════════════════════
section "8. Per-tx spend limit enforcement"
# ══════════════════════════════════════════════════════════════════════════════

EVM2="0x$(openssl rand -hex 20)"
split "$(api POST /api/agents/register '{"name":"TightAgent","evmAddress":"'"$EVM2"'","chainId":84532,"defaultPolicy":{"spendLimitPerTxUsd":0.01}}' '')"
assert_status "8a Tight agent register" "$STATUS" "201"
TIGHT_KEY=$(echo "$BODY" | jq -r '.runtimeKey')

# Approve calldata — not spend-bearing → should still pass (approve is exempt)
SAVED_KEY="$RUNTIME_KEY"; RUNTIME_KEY="$TIGHT_KEY"
HASH2=$(compute_intent_hash 84532 0 "$USDC" "$APPROVE_CALLDATA" 0 100000 1000000000 1000000000 2 "[]")
split "$(api POST /api/validate '{"chainId":84532,"nonce":0,"to":"'"$USDC"'","calldata":"'"$APPROVE_CALLDATA"'","valueWei":"0","gasLimit":"100000","maxFeePerGas":"1000000000","maxPriorityFeePerGas":"1000000000","txType":2,"accessList":[],"intentHash":"'"$HASH2"'"}')"
assert_status "8b Approve exempt from spend limit" "$STATUS" "200"
RUNTIME_KEY="$SAVED_KEY"

# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${RESET}, ${RED}$FAIL failed${RESET}"
echo "══════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
