#!/usr/bin/env bash
# Starts NanoIDP for e2e tests as a Docker container.
# Shuts down the container gracefully when this process is terminated.
#
# Lifecycle managed by Playwright's webServer config:
#   - url: http://localhost:9000/api/health
#   - gracefulShutdown: { signal: "SIGTERM", timeout: 30000 }

set -euo pipefail

NANOIDP_PORT=9000
CONTAINER_NAME="nanoidp-e2e"

cleanup() {
    echo "[nanoidp-e2e] Stopping NanoIDP container..."
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    echo "[nanoidp-e2e] Done."
}
trap cleanup EXIT

# Remove any stale container from a previous run.
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

echo "[nanoidp-e2e] Starting NanoIDP on port $NANOIDP_PORT..."
docker run --rm --name "$CONTAINER_NAME" \
    -p "${NANOIDP_PORT}:${NANOIDP_PORT}" \
    ghcr.io/cdelmonte-zg/nanoidp:latest \
    sh -c "sed -i 's/port: 8000/port: ${NANOIDP_PORT}/g' /app/config/settings.yaml && \
           sed -i 's|http://localhost:8000|http://localhost:${NANOIDP_PORT}|g' /app/config/settings.yaml && \
           nanoidp --host 0.0.0.0 --port ${NANOIDP_PORT}"
