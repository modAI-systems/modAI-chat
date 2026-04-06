# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UNRELEASED]

### Added

- i18n support via `i18next` with browser language detection (supports English fallback and German). Translations are module-scoped: each module with user-facing strings has its own `locales/de.json`. New `src/modules/i18n/` module provides the `getT(namespace)` helper used by all components.
- Tools can now be toggled directly from the chat input panel via a wrench-icon popover — no separate Tools page needed.

### Changed

- Switch frontend to Svelte
- ChatInputPanel redesigned: textarea, model selector, tools selector, and send button are now visually inside a single input box (ai-sdk.dev/examples/chatbot style).
- Removed the Tools sidebar navigation item and `/tools` route from all module configurations.


## [0.0.1] - 2026-02-12

### Added

- Frontend backed by ModAI Backend
- Frontend without Backend
