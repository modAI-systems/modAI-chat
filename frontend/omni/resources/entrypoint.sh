#!/usr/bin/env sh
set -e

modules_dir="/app"
modules_file="$modules_dir/modules_${MODULES_FILE}.json"
fallback_modules_file="$modules_dir/modules_with_backend.json"

if [ ! -f "$modules_file" ]; then
  modules_file="$fallback_modules_file"
fi

if [ ! -f "$modules_file" ]; then
  echo "Module definition file not found: $modules_file"
  exit 1
fi

cp -f "$modules_file" "$modules_dir/modules.json"

exec "$@"
