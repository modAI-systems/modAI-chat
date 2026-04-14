<script lang="ts">
import type { Snippet } from "svelte";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";
import { SIDEBAR_MENU_BUTTON_CLASS } from "./styles";

const router = getRouterApi();

let {
    label,
    path,
    icon,
}: {
    label: string;
    path: `/${string}`;
    icon: Snippet;
} = $props();
</script>

<Sidebar.MenuItem>
    <Sidebar.MenuButton
        isActive={false}
        class={SIDEBAR_MENU_BUTTON_CLASS}
        onclick={() => router.navigate(path)}
    >
      {@render icon()}
        <span>{label}</span>
    </Sidebar.MenuButton>
</Sidebar.MenuItem>
