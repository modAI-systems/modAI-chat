#!/usr/bin/env bash
# Updates all shadcn-svelte components installed in this project.
# Discovers components dynamically from src/lib/components/ui/ and re-adds them
# with --overwrite so the latest versions replace the existing files.

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
UI_DIR="$SCRIPT_DIR/src/lib/shadcnui/components/ui"

if [[ ! -d "$UI_DIR" ]]; then
    echo "No shadcn components directory found at $UI_DIR"
    exit 1
fi

components=()
while IFS= read -r dir; do
    components+=("$(basename "$dir")")
done < <(find "$UI_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#components[@]} -eq 0 ]]; then
    echo "No shadcn components found in $UI_DIR"
    exit 0
fi

echo "Found ${#components[@]} component(s): ${components[*]}"
echo "Updating..."

cd "$SCRIPT_DIR"
pnpm dlx shadcn-svelte@latest add --yes --overwrite "${components[@]}"

echo "Done. All shadcn components updated."
