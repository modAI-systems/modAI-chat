# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- User avatar at the bottom of the sidebar showing the logged-in user.

## [0.0.2] - 2026-04-13

### Added

- i18n support via `i18next` with browser language detection (supports English fallback and German). Translations are module-scoped: each module with user-facing strings has its own `locales/de.json`. New `src/modules/i18n/` module provides the `getT(namespace)` helper used by all components.
- Tools can now be toggled directly from the chat input panel via a wrench-icon popover — no separate Tools page needed.
- External frontend modules under `src/modules/external-*` can now carry their own npm dependencies through pnpm workspace package discovery, without requiring edits to the root `package.json`.
- Manifest `includes` support: the root `modules.json` can now declare an `includes` array to compose the module list from multiple JSON files. Included files are merged left-to-right; the root manifest always wins. Per-module `collisionStrategy` (`merge` | `replace` | `drop`) controls collision behaviour, mirroring the backend YAML config loader.

### Changed

- Switch frontend to Svelte
- Updated tools fetching and chat tool handling to support `/api/tools` responses as a raw list of function tools (instead of requiring a `{ tools: [...] }` envelope)
- ChatInputPanel redesigned: textarea, model selector, tools selector, and send button are now visually inside a single input box (ai-sdk.dev/examples/chatbot style).
- Removed the Tools sidebar navigation item and `/tools` route from all module configurations.
- Made the chat tools selector popover scrollable with a viewport-constrained height so long tool lists remain fully accessible.
- Simplified the chat tools selector list to show only tool names; tool descriptions are now shown as tooltips on hover/focus.
- Tool identifiers are now displayed as human-readable names in the chat tools selector (for example, `some_tool` -> `Some Tool`).


## [0.0.1] - 2026-02-12

### Added

- Frontend backed by ModAI Backend
- Frontend without Backend
