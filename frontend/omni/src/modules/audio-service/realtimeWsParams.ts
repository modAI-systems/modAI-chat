import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";

/**
 * Build the WebSocket URL and authentication protocols for the realtime endpoint.
 *
 * - If providerBaseUrl is relative (starts with "/") the request is routed
 *   through the modAI backend proxy which adds auth headers server-side.
 * - If providerBaseUrl is an absolute URL the browser connects directly to
 *   the provider. Since browser WebSockets cannot set custom headers, the
 *   API key is passed via the WebSocket subprotocol mechanism that OpenAI
 *   supports for browser clients.
 */
export function buildRealtimeWsParams(m: ProviderModel | null): {
    url: string;
    protocols: string[];
} {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";

    if (!m?.providerBaseUrl.startsWith("http")) {
        // Backend proxy mode — backend resolves the provider and adds auth
        const modelParam = m
            ? encodeURIComponent(`${m.providerName}/${m.modelName}`)
            : "";
        return {
            url: `${proto}//${window.location.host}/api/realtime?model=${modelParam}`,
            protocols: [],
        };
    }

    // Direct browser mode — pass auth via WebSocket subprotocol (the only
    // mechanism available, as browser WebSocket cannot set request headers).
    const wsBase = m.providerBaseUrl
        .replace("https://", "wss://")
        .replace("http://", "ws://")
        .replace(/\/$/, "");
    const url = `${wsBase}/realtime?model=${encodeURIComponent(m.modelName)}`;
    const protocols = m.providerApiKey
        ? ["realtime", `openai-insecure-api-key.${m.providerApiKey}`]
        : [];
    return { url, protocols };
}
