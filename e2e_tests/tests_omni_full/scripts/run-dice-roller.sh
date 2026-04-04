#!/usr/bin/env bash
# Starts the dice-roller tool microservice for e2e tests.
#
# Lifecycle managed by Playwright's webServer config:
#   - url: http://localhost:8001/openapi.json

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DICE_ROLLER_DIR="$ROOT_DIR/backend/tools/dice-roller"

cd "$DICE_ROLLER_DIR"

exec uv run uvicorn main:app --port 8001
