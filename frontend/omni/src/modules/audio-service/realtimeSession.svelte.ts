import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type {
    RealtimeMessageCallback,
    RealtimeSession,
    RealtimeStatus,
} from "./index.svelte.js";
import { buildSessionUpdatePayload } from "./realtimeConfig.js";
import { handleRealtimeEvent } from "./realtimeEventHandler.js";
import { connectMicToWorklet, loadAudioWorklet } from "./realtimeMicSetup.js";
import { buildRealtimeWsParams } from "./realtimeWsParams.js";

export function createRealtimeSession(
    model: () => ProviderModel | null,
    transcriptModel: () => ProviderModel | null,
    onMessage: RealtimeMessageCallback,
): RealtimeSession {
    let status = $state<RealtimeStatus>("idle");
    let ws: WebSocket | null = null;
    let audioContext: AudioContext | null = null;
    let micStream: MediaStream | null = null;
    const playbackTimeRef = { value: 0 };
    const userDeltaRef = { received: false };

    async function start() {
        status = "connecting";
        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            const ctx = new AudioContext({ sampleRate: 24000 });
            await ctx.resume();
            audioContext = ctx;
            playbackTimeRef.value = ctx.currentTime;

            await loadAudioWorklet(ctx);

            const m = model();
            const { url: wsUrl, protocols } = buildRealtimeWsParams(m);
            console.log("[Realtime] connecting to", wsUrl);
            ws =
                protocols.length > 0
                    ? new WebSocket(wsUrl, protocols)
                    : new WebSocket(wsUrl);

            const localWs = ws;
            await new Promise<void>((resolve, reject) => {
                localWs.onopen = () => {
                    const payload = buildSessionUpdatePayload(
                        transcriptModel()?.modelName ?? "",
                    );
                    console.log(
                        "[Realtime] WebSocket connected, sending session.update:",
                        payload,
                    );
                    ws?.send(payload);
                    resolve();
                };
                localWs.onerror = () =>
                    reject(new Error("WebSocket connection failed"));
            });

            ws.onmessage = (e) =>
                handleRealtimeEvent(
                    e,
                    audioContext,
                    playbackTimeRef,
                    onMessage,
                    userDeltaRef,
                );
            ws.onerror = () => {
                cleanup();
                status = "error";
            };
            ws.onclose = (e) => {
                if (status === "active" || status === "connecting") {
                    cleanup();
                    status = e.wasClean ? "idle" : "error";
                }
            };

            connectMicToWorklet(ctx, micStream, (payload) => {
                if (ws?.readyState === WebSocket.OPEN) ws.send(payload);
            });

            status = "active";
        } catch (err) {
            console.error("[Realtime] Failed to start:", err);
            cleanup();
            status = "error";
        }
    }

    function stop() {
        cleanup();
        status = "idle";
    }

    function cleanup() {
        ws?.close();
        ws = null;
        micStream?.getTracks().forEach((t) => {
            t.stop();
        });
        micStream = null;
        audioContext?.close();
        audioContext = null;
        playbackTimeRef.value = 0;
        userDeltaRef.received = false;
    }

    return {
        get status() {
            return status;
        },
        start,
        stop,
        cleanup,
    };
}
