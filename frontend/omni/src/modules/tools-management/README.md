# Tools Management

UI for browsing available tools and toggling tool selection for use in chat.

## Intended Usage

This module group is consumed automatically via the module system. It depends on `tools-management-service` for tool state management.

## Intended Integration

Registers an `AppRoute` via `route.svelte.ts` at `/tools`. A `SidebarSettingItem` is also registered to appear in the sidebar settings group.
