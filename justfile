# Install dependencies in all sub-projects
install:
    just --justfile backend/omni/justfile install
    just --justfile backend/tools/dice-roller/justfile install
    just --justfile frontend/omni/justfile install
    just --justfile e2e_tests/tests_omni_full/justfile install
    just --justfile e2e_tests/tests_omni_light/justfile install
    just --justfile docs/justfile install

# Run format in all sub-projects
format:
    just --justfile backend/omni/justfile format
    just --justfile backend/tools/dice-roller/justfile format
    just --justfile frontend/omni/justfile format
    just --justfile e2e_tests/tests_omni_full/justfile format
    just --justfile e2e_tests/tests_omni_light/justfile format
    just --justfile docs/justfile format
