<script lang="ts">
import { Plus } from "lucide-svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { CHAT_PATH } from "./chatRouteDefinition.svelte";

const t = getT("chat");
const router = getRouterApi();
</script>

<Sidebar.MenuSubItem>
	<Sidebar.MenuSubButton data-active={null} onclick={() => router.navigate(CHAT_PATH)}>
		<Plus />
		<span>{t("newLabel", { defaultValue: "New" })}</span>
	</Sidebar.MenuSubButton>
</Sidebar.MenuSubItem>
