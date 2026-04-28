#!/usr/bin/env bash
# Check that every content file in docs/en exists in every other language.
# Usage: scripts/check-i18n-parity.sh [docs-dir]

set -euo pipefail

DOCS="${1:-docs}"
cd "$DOCS"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

find ./en -type f | sed 's|^./en/||' | sort > "$TMP/en"

errors=0
for lang in */; do
  [[ "$lang" == "public/" ]] && continue
  find "./$lang" -type f | sed "s|^./${lang}||" | sort > "$TMP/${lang%/}"
  if ! diff "$TMP/en" "$TMP/${lang%/}" > /dev/null; then
    echo "--- [en] vs [${lang%/}] ---"
    diff "$TMP/en" "$TMP/${lang%/}" \
      | grep '^[<>]' \
      | sed "s|^< |  MISSING in [${lang%/}]: |; s|^> |  MISSING in [en]: |"
    errors=1
  fi
done

if [ "$errors" -eq 0 ]; then
  total=$(wc -l < "$TMP/en" | tr -d ' ')
  echo "✓  All languages are in parity — $total files each."
else
  exit 1
fi
