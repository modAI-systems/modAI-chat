# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UNRELEASED]

### Added

- Config can include other config files
- OpenAPI tool registry now supports `tool_servers` and auto-registers all `operationId` endpoints from each OpenAPI spec as tools

### Chnaged

- Config to be used can be defined via CONFIG_PATH environment variable
- Refactored tools contract to use request-aware registry methods: `get_tools(request)` and `run_tool(request, params)`
- Tool definitions now use OpenAI Responses API `FunctionToolParam` shape directly
- `GET /api/tools` now returns the raw tool-definition list (no `{ "tools": ... }` envelope)

## [0.0.1] - 2026-02-12

### Added

- ModAI inital Backend
