#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

docker container run --rm \
  -p 8080:8080 \
  -v "${SCRIPT_DIR}/doc_build:/srv:ro" \
  caddy caddy file-server --root /srv --listen :8080
