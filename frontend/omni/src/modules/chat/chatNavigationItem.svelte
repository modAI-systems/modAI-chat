<script lang="ts">
import { MessageSquare } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import { SIDEBAR_MENU_BUTTON_CLASS } from "@/modules/main-app-sidebar-based/lib/styles";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { CHAT_PATH } from "./chatRouteDefinition.svelte";

const t = getT("chat");
const router = getRouterApi();
</script>

<Sidebar.MenuItem>
	<Sidebar.MenuButton
		isActive={false}
		class={SIDEBAR_MENU_BUTTON_CLASS}
		onclick={() => router.navigate(CHAT_PATH)}
	>
		<MessageSquare />
		<span>{t("navLabel", { defaultValue: "Chat" })}</span>
	</Sidebar.MenuButton>
</Sidebar.MenuItem>
