# LLM Provider Management

Provides a user interface for managing LLM providers in the global settings. Allows users to view configured providers and create new ones.

## Intended Usage

This module integrates into the global settings page, providing a dedicated section for LLM provider management. Users can select a provider type, view existing providers, and add new provider configurations.

## Intended Integration

This module registers two components with the module system:

- `GlobalSettingsRouterEntry`: Adds a route for `/settings/global/llm-providers`
- `GlobalSettingsNavItem`: Adds a navigation item in the global settings sidebar

The module depends on the `llm-provider-service` for backend communication.

## Sub-Module Integration

None - this is a standalone settings page.
