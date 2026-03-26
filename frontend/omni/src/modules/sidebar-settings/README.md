# Sidebar Settings

Provides the settings navigation group for the sidebar. Collects `SidebarSettingItem` sub-modules and renders them as a collapsible "LLM" settings section.

## Intended Integration

Registered as a `SidebarContentItem` (Svelte component) and rendered by the sidebar module.

## Sub-Module Integration

### Setting Items

To add an entry to the settings group, register a module with type `"SidebarSettingItem"` that exports a default object satisfying the `SidebarSettingItem` interface:

```typescript
import Settings2Icon from "@lucide/svelte/icons/settings-2";
import type { SidebarSettingItem } from "@/modules/sidebar-settings/sidebarSettingItem";

export default {
  title: "My Feature",
  url: "/my-feature",
  icon: Settings2Icon,
} satisfies SidebarSettingItem;
```
