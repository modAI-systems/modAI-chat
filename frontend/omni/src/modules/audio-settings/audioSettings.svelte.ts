import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";

const STORAGE_KEY = "modai-audio-realtime-model";
const TRANSCRIPT_STORAGE_KEY = "modai-audio-transcript-model";

function isProviderModel(value: unknown): value is ProviderModel {
    if (typeof value !== "object" || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.providerName === "string" &&
        typeof v.providerBaseUrl === "string" &&
        typeof v.modelName === "string"
    );
}

function loadStoredProviderModel(key: string): ProviderModel | null {
    if (typeof localStorage === "undefined") return null;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    try {
        const parsed: unknown = JSON.parse(stored);
        if (isProviderModel(parsed)) return parsed;
        // Stale string format or invalid shape — discard
        localStorage.removeItem(key);
        return null;
    } catch {
        localStorage.removeItem(key);
        return null;
    }
}

let realtimeModel = $state<ProviderModel | null>(
    loadStoredProviderModel(STORAGE_KEY),
);
let transcriptModel = $state<ProviderModel | null>(
    loadStoredProviderModel(TRANSCRIPT_STORAGE_KEY),
);

/** Returns the currently configured realtime voice model (reactive), or null if none selected. */
export function getRealtimeModel(): ProviderModel | null {
    return realtimeModel;
}

/** Persist a new realtime voice model selection. */
export function setRealtimeModel(model: ProviderModel): void {
    realtimeModel = model;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
}

/** Returns the currently configured transcript model (reactive), or null if none selected. */
export function getTranscriptModel(): ProviderModel | null {
    return transcriptModel;
}

/** Persist a new transcript model selection. */
export function setTranscriptModel(model: ProviderModel): void {
    transcriptModel = model;
    localStorage.setItem(TRANSCRIPT_STORAGE_KEY, JSON.stringify(model));
}

/**
 * Returns true when the given model ID is a realtime-capable model.
 * Identified by the presence of "realtime" in the model ID (case-insensitive).
 */
export function isRealtimeModel(modelId: string): boolean {
    return modelId.toLowerCase().includes("realtime");
}
