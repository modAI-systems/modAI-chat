# Sidebar

Provides the application sidebar shell containing a settings navigation menu and an optional user profile footer.
Dynamically composes its content from sub-modules registered via the module system.

## Intended Integration

The sidebar is registered as a `SidebarComponent` module and rendered by the root application layout.

## Sub-Module Integration

### Settings Items

To add an entry to the sidebar settings menu, register a module with type `"SidebarSettingItem"` that exports a default object satisfying the `SidebarSettingItem` interface:

```typescript
import Settings2Icon from "@lucide/svelte/icons/settings-2";
import type { SidebarSettingItem } from "@/modules/sidebar/sidebarItem";

export default {
  title: "My Feature",
  url: "/my-feature",
  icon: Settings2Icon,
} satisfies SidebarSettingItem;
```

### User Item

To display a user profile in the sidebar footer, register a single module with type `"SidebarUserItem"` that exports a default object satisfying the `SidebarUserItem` interface (`{ name, email, avatar }`). Only one module should register this type.
