<script lang="ts">
import { LoaderCircle, Mic, MicOff } from "lucide-svelte";
import { untrack } from "svelte";
import type {
    AudioService,
    RealtimeMessageCallback,
} from "@/modules/audio-service/index.svelte.js";
import { getT } from "@/modules/i18n/index.svelte.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";

const t = getT("chat");

let {
    audioService,
    model = null,
    transcriptModel = null,
    disabled = false,
    onmessage,
}: {
    audioService: AudioService;
    model?: ProviderModel | null;
    transcriptModel?: ProviderModel | null;
    disabled?: boolean;
    onmessage?: RealtimeMessageCallback;
} = $props();

const noopCallbacks: RealtimeMessageCallback = {
    onDelta() {},
    onDone() {},
};

const session = untrack(() =>
    audioService.createSession(
        () => model ?? null,
        () => transcriptModel ?? null,
        onmessage ?? noopCallbacks,
    ),
);

$effect(() => {
    return () => session.cleanup();
});
</script>

{#if session.status === "connecting"}
    <Button size="sm" variant="outline" disabled>
        <LoaderCircle class="size-3.5 animate-spin" />
        {t("connectingVoice", { defaultValue: "Connecting..." })}
    </Button>
{:else if session.status === "active"}
    <Button size="sm" variant="destructive" onclick={session.stop}>
        <MicOff class="size-3.5" />
        {t("stopVoice", { defaultValue: "Stop voice" })}
    </Button>
{:else if session.status === "error"}
    <Button
        size="sm"
        variant="outline"
        class="text-destructive border-destructive hover:bg-destructive/10"
        onclick={() => session.start()}
        title={t("voiceError", { defaultValue: "Voice failed — click to retry" })}
    >
        <Mic class="size-3.5" />
        {t("retryVoice", { defaultValue: "Retry voice" })}
    </Button>
{:else}
    <Button size="sm" variant="outline" onclick={session.start} disabled={disabled || !model}>
        <Mic class="size-3.5" />
        {t("startVoice", { defaultValue: "Voice" })}
    </Button>
{/if}
