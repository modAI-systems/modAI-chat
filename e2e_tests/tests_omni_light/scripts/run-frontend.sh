#!/usr/bin/env bash
# Builds the frontend and starts a Caddy Docker container serving the dist for e2e light tests.
#
# Uses frontend/omni browser-only manifest composed with the test fixtures
# modules.json (which includes modules_browser_only.json and adds the external
# test module entries via the composition system).

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend/omni"
LIGHT_TESTS_DIR="$ROOT_DIR/e2e_tests/tests_omni_light"

cd "$FRONTEND_DIR"

rm -rf src/modules/external-module-test
cp -R "$LIGHT_TESTS_DIR/fixtures/external-module-test" src/modules/external-module-test

rm -f public/modules.json
cp "$LIGHT_TESTS_DIR/fixtures/modules.json" public/modules.json

pnpm install
pnpm build

docker container run --rm -i \
    -p 4173:80 \
    -v "$FRONTEND_DIR/dist:/usr/share/caddy:ro" \
    caddy:alpine caddy run --adapter caddyfile --config /dev/stdin <<'CADDYEOF'
:80 {
    root * /usr/share/caddy
    try_files {path} /index.html
    file_server
}
CADDYEOF
