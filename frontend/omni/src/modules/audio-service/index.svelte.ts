import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";

export type RealtimeStatus = "idle" | "connecting" | "active" | "error";

export interface RealtimeMessageCallback {
    onDelta(role: "user" | "assistant", delta: string): void;
    onDone(role: "user" | "assistant"): void;
}

export interface RealtimeSession {
    readonly status: RealtimeStatus;
    start(): Promise<void>;
    stop(): void;
    cleanup(): void;
}

export interface AudioService {
    createSession(
        model: () => ProviderModel | null,
        transcriptModel: () => ProviderModel | null,
        onMessage: RealtimeMessageCallback,
    ): RealtimeSession;
}
