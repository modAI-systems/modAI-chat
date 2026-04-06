<script lang="ts">
import { LoaderCircle, SendIcon } from "lucide-svelte";
import type { Snippet } from "svelte";
import { getT } from "@/modules/i18n/index.svelte.js";
import { Button } from "$lib/shadcnui/components/ui/button/index.js";
import { Textarea } from "$lib/shadcnui/components/ui/textarea/index.js";

const t = getT("chat");

let {
    canChat,
    isIdle,
    children,
    onsend,
}: {
    canChat: boolean;
    isIdle: boolean;
    children?: Snippet;
    onsend: (text: string) => void;
} = $props();

let input = $state("");

function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    sendMessage();
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    if (!input.trim()) return;
    onsend(input);
    input = "";
}
</script>

<div class="shrink-0">
	<div class="mx-auto w-full max-w-3xl px-4 py-3">
		<form onsubmit={handleSubmit}>
			<div
				class="border-input bg-background focus-within:ring-ring rounded-2xl border px-4 py-3 focus-within:ring-2 focus-within:ring-offset-0"
			>
				<Textarea
					bind:value={input}
					onkeydown={handleKeydown}
					placeholder={t("typeMessage", { defaultValue: "Type a message..." })}
					class="border-0 shadow-none focus-visible:ring-0 min-h-[44px] resize-none p-0 max-h-48 !bg-transparent dark:!bg-transparent disabled:!bg-transparent dark:disabled:!bg-transparent"
					rows={1}
					disabled={!canChat}
				/>

				<div class="mt-2 flex items-center gap-1">
					{@render children?.()}

					<div class="flex-1"></div>

					<Button
						type="submit"
						size="sm"
						disabled={!input.trim() || !canChat}
						class="gap-1.5"
					>
						{#if !isIdle}
							<LoaderCircle class="size-3.5 animate-spin" />
						{:else}
							<SendIcon class="size-3.5" />
						{/if}
						{t("send", { defaultValue: "Send" })}
					</Button>
				</div>
			</div>
		</form>
	</div>
</div>
