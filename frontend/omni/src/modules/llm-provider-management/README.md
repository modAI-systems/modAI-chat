# LLM Provider Management

UI for managing LLM provider connections — add, edit, delete providers and check their health status.

## Intended Usage

This module group is consumed automatically via the module system. It depends on `llm-provider-service` for provider state management.

## Intended Integration

Registers an `AppRoute` via `route.svelte.ts` at `/providers`. A `SidebarSettingItem` is also registered to link to the providers page from the sidebar.
