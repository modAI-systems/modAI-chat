<script lang="ts">
import { PanelRight } from "lucide-svelte";
import type { Snippet } from "svelte";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";

let {
    sidebar,
    children,
}: {
    sidebar?: Snippet;
    children?: Snippet;
} = $props();
</script>

<Sidebar.Provider>
    <Sidebar.Inset>
        <header class="flex justify-end border-b bg-background/80 px-4 py-2 backdrop-blur md:px-6">
            <Sidebar.Trigger aria-label="Toggle navigation" />
        </header>
        <div class="flex-1 overflow-hidden">
            {@render children?.()}
        </div>
    </Sidebar.Inset>

    <Sidebar.Root side="right">
        <Sidebar.Header class="border-b border-sidebar-border/60 px-3 py-2">
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <p class="truncate text-sm font-semibold tracking-tight">modAI</p>
                    <p class="truncate text-xs text-sidebar-foreground/70">Modular AI Workspace</p>
                </div>
                <Sidebar.Trigger class="md:hidden" aria-label="Toggle navigation">
                    <PanelRight class="size-4" />
                </Sidebar.Trigger>
            </div>
        </Sidebar.Header>
        <Sidebar.Content class="px-2 py-3">
            {@render sidebar?.()}
        </Sidebar.Content>
    </Sidebar.Root>
</Sidebar.Provider>
