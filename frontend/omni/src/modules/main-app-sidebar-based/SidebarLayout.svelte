<script lang="ts">
import { PanelLeft } from "lucide-svelte";
import type { Snippet } from "svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import * as Sidebar from "$lib/shadcnui/components/ui/sidebar/index.js";

const t = getT("main-app-sidebar-based");

let {
    sidebarHeader,
    sidebarFooter,
    children,
}: {
    sidebarHeader?: Snippet;
    sidebarFooter?: Snippet;
    children?: Snippet;
} = $props();

// Drag-to-resize
const MIN_WIDTH_PX = 160;
const COLLAPSE_ZONE_PX = 120;
const MAX_WIDTH_PX = 520;
const COLLAPSE_THRESHOLD_X = MIN_WIDTH_PX - COLLAPSE_ZONE_PX;

let sidebarOpen = $state(true);
let wrapperRef = $state<HTMLDivElement | null>(null);

function handleDrag(e: PointerEvent) {
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    const wrapper = wrapperRef;
    if (!wrapper) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    wrapper.dataset.dragging = "true";
    let pending = false;
    let latestX = e.clientX;
    function cleanup() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        delete wrapper?.dataset.dragging;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }
    function onMove(ev: PointerEvent) {
        latestX = ev.clientX;
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            if (latestX >= MIN_WIDTH_PX) {
                wrapper?.style.setProperty(
                    "--sidebar-width",
                    `${Math.min(MAX_WIDTH_PX, latestX)}px`,
                );
                if (!sidebarOpen) sidebarOpen = true;
            } else if (latestX > COLLAPSE_THRESHOLD_X) {
                if (sidebarOpen)
                    wrapper?.style.setProperty(
                        "--sidebar-width",
                        `${MIN_WIDTH_PX}px`,
                    );
            } else {
                if (sidebarOpen) sidebarOpen = false;
            }
        });
    }
    function onUp() {
        cleanup();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
}
</script>

<Sidebar.Provider bind:open={sidebarOpen} bind:ref={wrapperRef}>
    <Sidebar.Root side="left">
        <Sidebar.Header class="border-b border-sidebar-border/60 px-3 py-2">
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <p class="truncate text-sm font-semibold tracking-tight">modAI</p>
                    <p class="truncate text-xs text-sidebar-foreground/70">{t("workspaceSubtitle", { defaultValue: "Modular AI Workspace" })}</p>
                </div>
                <Sidebar.Trigger class="md:hidden" aria-label={t("toggleNavigation", { defaultValue: "Toggle navigation" })}>
                    <PanelLeft class="size-4" />
                </Sidebar.Trigger>
            </div>
        </Sidebar.Header>
        <Sidebar.Content class="px-2 py-3">
            {@render sidebarHeader?.()}
        </Sidebar.Content>
        {#if sidebarFooter}
            <Sidebar.Footer class="px-2 py-3">
                {@render sidebarFooter()}
            </Sidebar.Footer>
        {/if}

        <!-- Resize handle -->
        <button
            tabindex={-1}
            aria-label={t("resizeSidebar", { defaultValue: "Resize sidebar" })}
            onpointerdown={handleDrag}
            class="absolute inset-y-0 -right-1 z-20 hidden w-2 cursor-col-resize select-none sm:block hover:bg-sidebar-border/60 active:bg-sidebar-border transition-colors"
        ></button>
    </Sidebar.Root>

    <Sidebar.Inset>
        <header class="flex justify-start border-b bg-background/80 px-4 py-2 backdrop-blur md:px-6">
            <Sidebar.Trigger aria-label={t("toggleNavigation", { defaultValue: "Toggle navigation" })} />
        </header>
        <div class="flex-1 overflow-hidden">
            {@render children?.()}
        </div>
    </Sidebar.Inset>
</Sidebar.Provider>

<style>
    /* Suppress all transitions inside the sidebar wrapper while dragging, to avoid lagging while dragging */
    :global([data-slot="sidebar-wrapper"][data-dragging] *) {
        transition-duration: 0s !important;
    }
</style>
