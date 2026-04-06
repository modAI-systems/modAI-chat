<script lang="ts">
import { MessageSquare } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import SidebarMenuNavigationItem from "@/modules/main-app-sidebar-based/lib/SidebarMenuNavigationItem.svelte";
import { CHAT_PATH } from "./chatRouteDefinition.svelte";

const t = getT("chat");
</script>

{#snippet icon()}
	<MessageSquare />
{/snippet}

<SidebarMenuNavigationItem
	label={t("navLabel", { defaultValue: "Chat" })}
	path={CHAT_PATH}
	{icon}
/>
