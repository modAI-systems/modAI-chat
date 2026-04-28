# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-04-28

### Added

- `GET /api/auth/userinfo` no longer performs `user_store`-backed JIT provisioning or user lookup; it now serves claims directly from the JWT session cookie
- `GET /api/auth/csrf` - returns a CSRF token derived from the active session cookie (HMAC-SHA256)
- `POST /api/auth/logout` now requires a valid `X-CSRF-Token` header (returns 403 without it); redirects to the IDP `end_session_endpoint` when available, falls back to `post_logout_uri`
- Docker image now published as a multi-platform manifest covering `linux/amd64` and `linux/arm64`.

## [0.0.2] - 2026-04-13

### Added

- Config can include other config files
- OpenAPI tool registry now supports `tool_servers` and auto-registers all `operationId` endpoints from each OpenAPI spec as tools

### Changed

- Config to be used can be defined via CONFIG_PATH environment variable
- Refactored tools contract to use request-aware registry methods: `get_tools(request)` and `run_tool(request, params)`
- Tool definitions now use OpenAI Responses API `FunctionToolParam` shape directly
- `GET /api/tools` now returns the raw tool-definition list (no `{ "tools": ... }` envelope)

## [0.0.1] - 2026-02-12

### Added

- ModAI inital Backend
