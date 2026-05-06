#!/usr/bin/env bash
# Starts AIMock for e2e tests using the fixture file from tests_omni_light/src/.
#
# Lifecycle managed by Playwright's webServer config:
#   - url: http://localhost:4010/health
#
# WORKAROUND: AIMock's CORS preflight response only allows "Content-Type, Authorization"
# in Access-Control-Allow-Headers. Firefox (unlike Chrome) includes the "user-agent" header
# in preflight requests when the OpenAI SDK sets it, which causes CORS blocks.
# We patch server.js inside the container to use "*" instead.
# Remove this workaround once https://github.com/CopilotKit/aimock/issues/158 is resolved.

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
FIXTURES_FILE="$SCRIPT_DIR/../src/aimock-fixtures.json"

docker container rm -f e2e-light-aimock 2>/dev/null || true
docker container run --rm --pull always \
    --name e2e-light-aimock \
    -p 4010:4010 \
    -v "$FIXTURES_FILE:/fixtures/aimock-fixtures.json:ro" \
    --entrypoint /bin/sh \
    ghcr.io/copilotkit/aimock:latest \
    -c 'sed -i "s/\"Access-Control-Allow-Headers\": \"Content-Type, Authorization\"/\"Access-Control-Allow-Headers\": \"*\"/" dist/server.js && \
        node dist/cli.js --fixtures /fixtures/aimock-fixtures.json --host 0.0.0.0'
