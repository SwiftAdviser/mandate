#!/usr/bin/env bash
# Sync public/SKILL.md to all downstream copies.
# Source of truth: public/SKILL.md
# Run after any SKILL.md edit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/SKILL.md"

if [ ! -f "$SRC" ]; then
  echo "ERROR: $SRC not found" >&2
  exit 1
fi

VERSION="$(head -10 "$SRC" | grep '^version:' | awk '{print $2}')"
echo "Syncing SKILL.md v${VERSION} from public/SKILL.md"

# Targets that get an exact copy (same frontmatter)
EXACT_TARGETS=(
  "packages/openclaw-plugin/SKILL.md"
  "packages/openclaw-plugin/skills/mandate/SKILL.md"
)

# Targets that need different frontmatter
REWRITE_TARGETS=(
  "packages/claude-mandate-plugin/skills/mandate-api/SKILL.md"
)

for target in "${EXACT_TARGETS[@]}"; do
  dest="$ROOT/$target"
  if [ -d "$(dirname "$dest")" ]; then
    cp "$SRC" "$dest"
    echo "  -> $target"
  else
    echo "  SKIP $target (dir missing)"
  fi
done

for target in "${REWRITE_TARGETS[@]}"; do
  dest="$ROOT/$target"
  if [ -d "$(dirname "$dest")" ]; then
    # Replace frontmatter: strip original, prepend plugin-specific
    BODY="$(awk '/^---$/{n++} n>=2' "$SRC" | tail -n +2)"
    cat > "$dest" <<FRONT
---
name: mandate-api
description: Non-custodial agent wallet policy layer. Enforces spend limits, allowlists, and approval workflows. Preflight or validate before every transaction.
---
FRONT
    echo "$BODY" >> "$dest"
    echo "  -> $target (rewritten frontmatter)"
  else
    echo "  SKIP $target (dir missing)"
  fi
done

echo "Done."
