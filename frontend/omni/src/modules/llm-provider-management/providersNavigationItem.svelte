<script lang="ts">
import { Settings2 } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import SidebarMenuNavigationItem from "@/modules/main-app-sidebar-based/lib/SidebarMenuNavigationItem.svelte";
import { PROVIDERS_PATH } from "./providersRouteDefinition.svelte";

const t = getT("llm-provider-management");
</script>

{#snippet icon()}
	<Settings2 />
{/snippet}

<SidebarMenuNavigationItem
  label={t("navLabel", { defaultValue: "Providers" })}
  path={PROVIDERS_PATH}
  {icon}
/>
