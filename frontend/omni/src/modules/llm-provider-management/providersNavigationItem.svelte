<script lang="ts">
import { Settings2 } from "lucide-svelte";
import SidebarMenuNavigationItem from "@/modules/main-app-sidebar-based/lib/SidebarMenuNavigationItem.svelte";
import { PROVIDERS_PATH } from "./providersRouteDefinition.svelte";
</script>

<SidebarMenuNavigationItem
  label="Providers"
  path={PROVIDERS_PATH}
  icon={Settings2}
/>
