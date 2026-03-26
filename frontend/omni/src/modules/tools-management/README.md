# Tools Management

UI for browsing available tools and toggling tool selection for use in chat.
Registers a sidebar settings entry to navigate to the tools page.

## Intended Usage

This module group is consumed automatically via the module system. It depends on `tools-management-service` for tool state management.

## Intended Integration

The tools page is accessible via the `ToolsRoute` module (type `"ToolsRoute"`). A sidebar entry is registered as `SidebarSettingItem` to link to the tools settings page.
