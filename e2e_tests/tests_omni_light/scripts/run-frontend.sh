#!/usr/bin/env bash
# Builds and starts the Vite preview server for e2e light tests.
#
# Uses frontend/omni browser-only manifest and extends it at runtime with
# external test module entries.

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend/omni"
LIGHT_TESTS_DIR="$ROOT_DIR/e2e_tests/tests_omni_light"

cd "$FRONTEND_DIR"

rm -rf src/modules/external-module-test
cp -R "$LIGHT_TESTS_DIR/fixtures/external-module-test" src/modules/external-module-test

rm -f public/modules.json
node "$LIGHT_TESTS_DIR/scripts/extend-light-modules-json.mjs"

pnpm install
pnpm build
exec pnpm preview
