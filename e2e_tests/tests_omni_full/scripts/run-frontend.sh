#!/usr/bin/env bash
# Builds and starts the Vite preview server for e2e tests.
#
# Uses frontend/omni (Svelte) with VITE_API_URL pointing at the local backend.
#
# Lifecycle managed by Playwright's webServer config:
#   - url: http://localhost:4173

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend/omni"

cd "$FRONTEND_DIR"

export VITE_API_URL="http://localhost:8000"

ln -sf modules_with_backend.json public/modules.json
pnpm build
exec pnpm preview
