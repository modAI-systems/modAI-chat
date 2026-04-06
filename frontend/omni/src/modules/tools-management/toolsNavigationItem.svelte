<script lang="ts">
import { Settings2, ToolCase } from "lucide-svelte";
import SidebarMenuNavigationItem from "@/modules/main-app-sidebar-based/lib/SidebarMenuNavigationItem.svelte";
import { TOOLS_PATH } from "./toolsRouteDefinition.svelte";
</script>

{#snippet icon()}
	<ToolCase />
{/snippet}

<SidebarMenuNavigationItem
  label="Tools"
  path={TOOLS_PATH}
  {icon}
/>
