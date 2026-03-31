import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";

export function modelSelectId(m: ProviderModel): string {
    return `${m.providerId}__${m.modelId}`;
}
