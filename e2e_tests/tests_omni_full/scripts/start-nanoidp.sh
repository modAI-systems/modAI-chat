#!/usr/bin/env bash
# Starts NanoIDP for e2e tests as a Docker container.
# Shuts down the container gracefully when this process is terminated.
#
# Lifecycle managed by Playwright's webServer config:
#   - url: http://localhost:9000/api/health
#   - gracefulShutdown: { signal: "SIGTERM", timeout: 30000 }

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
COMPOSE_FILE="$SCRIPT_DIR/../../../resources/compose-files/compose-nanoidp.yaml"

cleanup() {
    echo "[nanoidp-e2e] Stopping NanoIDP..."
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    echo "[nanoidp-e2e] Done."
}
trap cleanup EXIT

# Remove any stale container from a previous run.
cleanup &>/dev/null || true

echo "[nanoidp-e2e] Starting NanoIDP..."

docker compose -f "$COMPOSE_FILE" up --pull always
