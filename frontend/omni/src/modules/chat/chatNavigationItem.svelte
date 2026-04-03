<script lang="ts">
import { MessageSquare } from "lucide-svelte";
import SidebarMenuNavigationItem from "@/modules/main-app-sidebar-based/lib/SidebarMenuNavigationItem.svelte";
import { CHAT_PATH } from "./chatRouteDefinition.svelte";
</script>

{#snippet icon()}
	<MessageSquare />
{/snippet}

<SidebarMenuNavigationItem
	label="Chat"
	path={CHAT_PATH}
	{icon}
/>
