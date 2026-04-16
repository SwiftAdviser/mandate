#!/usr/bin/env bash
# Sync resources/skill.md to all downstream copies.
# Source of truth: resources/skill.md
# Run after any SKILL.md edit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/resources/skill.md"

if [ ! -f "$SRC" ]; then
  echo "ERROR: $SRC not found" >&2
  exit 1
fi

VERSION="$(head -10 "$SRC" | grep '^version:' | awk '{print $2}')"
echo "Syncing SKILL.md v${VERSION} from resources/skill.md"

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
description: "Use when enforcing spend limits, validating agent transactions, detecting prompt injection, or scanning for unprotected wallet calls. Non-custodial policy layer for AI agents."
---
FRONT
    echo "$BODY" >> "$dest"
    echo "  -> $target (rewritten frontmatter)"
  else
    echo "  SKIP $target (dir missing)"
  fi
done

# Publish to ClawhHub (requires: npx clawhub login)
SKILL_DIR="$ROOT/packages/openclaw-plugin/skills/mandate"
if [ -d "$SKILL_DIR" ]; then
  echo "Publishing to ClawhHub..."
  npx clawhub@latest publish "$SKILL_DIR" \
    --slug mandate \
    --version "$VERSION" \
    --changelog "SKILL.md v${VERSION}" \
    && echo "  ClawhHub publish done." \
    || echo "  WARN: ClawhHub publish failed (check auth with: npx clawhub login)"
else
  echo "  SKIP ClawhHub publish ($SKILL_DIR missing)"
fi

echo "Done."
