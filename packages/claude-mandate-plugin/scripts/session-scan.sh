#!/usr/bin/env bash
# Mandate SessionStart: init state + scan codebase for unprotected wallet calls.
# Shows results inline on every session start. The scan IS the first impression.
set -euo pipefail

# ── 1. Init validation state ──────────────────────────────────────────────────
STATE_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/mandate-plugin}"
mkdir -p "$STATE_DIR"
echo '{"validations":[]}' > "$STATE_DIR/validation-state.json"

# ── 2. Scan codebase ─────────────────────────────────────────────────────────
# Lightweight bash scanner: find wallet/financial calls, check for Mandate protection.
# No dependencies beyond grep/find/bash.

SCAN_DIR="."
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  SCAN_DIR="$CLAUDE_PROJECT_DIR"
fi

# Financial call patterns (what we're looking for)
FINANCIAL_RE='wallet\.transfer\(|wallet\.sendTransaction\(|wallet\.send\(|\.sendTransaction\(|\.sendRawTransaction\(|writeContract\(|walletClient\.write|executeAction\(.*transfer|execute_swap|execute_trade'

# ── Project-level protection check ───────────────────────────────────────────
# If Mandate SDK is a dependency OR this plugin is active, the project has
# Mandate at the infrastructure level. Individual files don't need imports.
PROJECT_PROTECTED=false

# Check package.json for @mandate.md/sdk dependency
if [ -f "$SCAN_DIR/package.json" ]; then
  if grep -qE '"@mandate\.md/sdk"|"@mandate/sdk"|"mandate"' "$SCAN_DIR/package.json" 2>/dev/null; then
    PROJECT_PROTECTED=true
  fi
fi

# Check if any package.json in workspaces has it
if [ "$PROJECT_PROTECTED" = false ]; then
  while IFS= read -r pkg; do
    if grep -qE '"@mandate\.md/sdk"|"@mandate/sdk"' "$pkg" 2>/dev/null; then
      PROJECT_PROTECTED=true
      break
    fi
  done < <(find "$SCAN_DIR" -maxdepth 3 -name 'package.json' ! -path '*/node_modules/*' 2>/dev/null)
fi

# Check for MANDATE.md or .mandate/ config in project root
if [ -f "$SCAN_DIR/MANDATE.md" ] || [ -d "$SCAN_DIR/.mandate" ]; then
  PROJECT_PROTECTED=true
fi

# This plugin being installed is itself a protection signal
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  PROJECT_PROTECTED=true
fi

# File-level protection patterns (imports, API calls)
FILE_PROTECT_RE='from .@mandate|require\(.*mandate|MandateClient|MandateWallet|mandate\.validate|mandate\.preflight|/api/validate'

TOTAL_FILES=0
TOTAL_FINDINGS=0
PROTECTED_COUNT=0
UNPROTECTED_COUNT=0
UNPROTECTED_FILES=""

# Find JS/TS files, skip node_modules/dist/.git/build
while IFS= read -r file; do
  TOTAL_FILES=$((TOTAL_FILES + 1))

  # Check for financial calls
  MATCHES=$(grep -cnE "$FINANCIAL_RE" "$file" 2>/dev/null || true)
  if [ "$MATCHES" -gt 0 ]; then
    TOTAL_FINDINGS=$((TOTAL_FINDINGS + MATCHES))

    if [ "$PROJECT_PROTECTED" = true ]; then
      # Project has Mandate installed: all calls are considered protected
      PROTECTED_COUNT=$((PROTECTED_COUNT + MATCHES))
    elif grep -qE "$FILE_PROTECT_RE" "$file" 2>/dev/null; then
      # File itself imports/uses Mandate
      PROTECTED_COUNT=$((PROTECTED_COUNT + MATCHES))
    else
      UNPROTECTED_COUNT=$((UNPROTECTED_COUNT + MATCHES))
      # Collect first unprotected line per file (max 5 files shown)
      if [ "$(echo "$UNPROTECTED_FILES" | grep -c '.' || true)" -lt 5 ]; then
        LINE_NUM=$(grep -nE "$FINANCIAL_RE" "$file" 2>/dev/null | head -1 | cut -d: -f1)
        LINE_TEXT=$(grep -E "$FINANCIAL_RE" "$file" 2>/dev/null | head -1 | sed 's/^[[:space:]]*//' | cut -c1-60)
        REL_PATH="${file#$SCAN_DIR/}"
        UNPROTECTED_FILES="${UNPROTECTED_FILES}    ${REL_PATH}:${LINE_NUM}  ${LINE_TEXT}\n"
      fi
    fi
  fi
done < <(find "$SCAN_DIR" -type f \( -name '*.ts' -o -name '*.js' -o -name '*.tsx' -o -name '*.jsx' \) \
  ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/dist/*' ! -path '*/build/*' 2>/dev/null)

# ── 3. Output ────────────────────────────────────────────────────────────────
# Only show output if there are findings worth reporting.

if [ "$TOTAL_FINDINGS" -eq 0 ]; then
  # No wallet calls in this project, stay silent
  exit 0
fi

echo ""
echo "  Mandate Scan"
echo ""

if [ "$UNPROTECTED_COUNT" -gt 0 ]; then
  echo "  ${UNPROTECTED_COUNT} unprotected wallet call(s) found in ${TOTAL_FILES} files:"
  echo ""
  printf "%b" "$UNPROTECTED_FILES"
  echo ""
  if [ "$PROTECTED_COUNT" -gt 0 ]; then
    echo "  ${PROTECTED_COUNT} call(s) already protected."
  fi
  echo "  Run: mandate validate --action <action> --reason <why> before each transaction."
else
  echo "  All ${TOTAL_FINDINGS} wallet call(s) are protected by Mandate. Clean."
fi

echo ""

# ── 4. Silent telemetry (fire-and-forget) ─────────────────────────────────────
if command -v curl >/dev/null 2>&1; then
  curl -s -m 2 -X POST "https://app.mandate.md/api/scan-telemetry" \
    -H "Content-Type: application/json" \
    -d "{\"filesScanned\":${TOTAL_FILES},\"unprotected\":${UNPROTECTED_COUNT},\"protected\":${PROTECTED_COUNT},\"ts\":$(date +%s),\"source\":\"plugin\"}" \
    >/dev/null 2>&1 &
fi

exit 0
