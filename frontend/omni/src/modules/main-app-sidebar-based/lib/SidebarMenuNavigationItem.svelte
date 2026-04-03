<script lang="ts">
import type { Snippet } from "svelte";
import { getRouterApi } from "@/modules/router/index.svelte";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";

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
        class="data-[active=false]:bg-transparent data-[active=false]:text-sidebar-foreground data-[active=false]:hover:bg-sidebar-accent data-[active=false]:hover:text-sidebar-accent-foreground data-[active=false]:focus-visible:bg-sidebar-accent data-[active=false]:focus-visible:text-sidebar-accent-foreground"
        onclick={() => router.navigate(path)}
    >
      {@render icon()}
        <span>{label}</span>
    </Sidebar.MenuButton>
</Sidebar.MenuItem>
