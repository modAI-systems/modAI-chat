#!/usr/bin/env bash
# Starts the modAI backend for e2e tests using NanoIDP as the OIDC provider.
#
# Lifecycle managed by Playwright's webServer config:
#   - url: http://localhost:8000/api/health

set -euo pipefail

SCRIPT_DIR=$(dirname "$(realpath "$0")")
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend/omni"

cd "$BACKEND_DIR"
rm -f *.db

export CONFIG_PATH="$SCRIPT_DIR/../backend-config-e2e.yaml"
export OIDC_ISSUER="http://localhost:9000"
export OIDC_CLIENT_ID="test-client"
export OIDC_REDIRECT_URI="http://localhost:8000/api/auth/callback"
export OIDC_POST_LOGIN_URI="http://localhost:4173/"
export OIDC_POST_LOGOUT_URI="http://localhost:4173/"
# Fixed secret for e2e tests (not production)
export SESSION_SECRET="e2e-test-session-secret-32-chars!!"
export CORS_ORIGINS="http://localhost:4173"

exec uv run uvicorn modai.main:app
