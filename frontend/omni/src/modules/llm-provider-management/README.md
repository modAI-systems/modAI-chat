# LLM Provider Management

UI for managing LLM provider connections — add, edit, delete providers and check their health status.
Registers a sidebar settings entry to navigate to the providers page.

## Intended Usage

This module group is consumed automatically via the module system. It depends on `llm-provider-service` for provider state management.

## Intended Integration

The providers page is accessible via the `ProvidersRoute` module (type `"ProvidersRoute"`). A sidebar entry is registered as `SidebarSettingItem` to link to the providers settings page.
