# Sidebar

Provides the application sidebar shell. Dynamically composes its content from sub-modules registered via the module system.

## Intended Integration

The sidebar is registered as a `SidebarComponent` module and rendered by the root application layout.

## Sub-Module Integration

### Content Items

To add a section to the sidebar content area, register a Svelte component module with type `"SidebarContentItem"`. Each content item is a Svelte component rendered directly inside the sidebar content area.

### Footer Item

To display content in the sidebar footer, register a single module with type `"SidebarFooterItem"` that exports a default object satisfying the `SidebarFooterItem` interface (`{ name, email, avatar }`). Only one module should register this type.
