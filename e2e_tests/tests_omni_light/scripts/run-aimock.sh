#!/usr/bin/env bash
# Starts AIMock for e2e tests using the fixture file from tests_omni_light/src/.
#
# Lifecycle managed by Playwright's webServer config:
#   - url: http://localhost:4010/health

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
FIXTURES_FILE="$SCRIPT_DIR/../src/aimock-fixtures.json"

docker container run --rm --pull always \
    -p 4010:4010 \
    -v "$FIXTURES_FILE:/app/fixtures/aimock-fixtures.json:ro" \
    ghcr.io/copilotkit/aimock:latest
