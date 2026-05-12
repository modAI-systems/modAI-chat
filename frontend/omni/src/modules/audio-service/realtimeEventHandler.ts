import type { RealtimeMessageCallback } from "./index.svelte.js";
import { playAudioDelta } from "./realtimeAudio.js";

export function handleRealtimeEvent(
    event: MessageEvent,
    audioContext: AudioContext | null,
    playbackTimeRef: { value: number },
    onMessage: RealtimeMessageCallback,
    userDeltaRef: { received: boolean },
): void {
    try {
        const msg = JSON.parse(event.data as string) as Record<string, unknown>;

        if (
            (msg.type === "response.audio.delta" ||
                msg.type === "response.output_audio.delta") &&
            typeof msg.delta === "string" &&
            audioContext
        ) {
            playAudioDelta(audioContext, msg.delta, playbackTimeRef);
        } else if (
            (msg.type === "response.audio_transcript.delta" ||
                msg.type === "response.output_audio_transcript.delta") &&
            typeof msg.delta === "string" &&
            msg.delta
        ) {
            onMessage.onDelta("assistant", msg.delta);
        } else if (
            msg.type === "response.audio_transcript.done" ||
            msg.type === "response.output_audio_transcript.done"
        ) {
            onMessage.onDone("assistant");
        } else if (
            msg.type === "conversation.item.input_audio_transcription.delta" &&
            typeof msg.delta === "string" &&
            msg.delta
        ) {
            userDeltaRef.received = true;
            onMessage.onDelta("user", msg.delta);
        } else if (
            msg.type === "conversation.item.input_audio_transcription.completed"
        ) {
            // Fallback: if no deltas arrived, use the full transcript from completed
            if (
                !userDeltaRef.received &&
                typeof msg.transcript === "string" &&
                msg.transcript
            ) {
                onMessage.onDelta("user", msg.transcript);
            }
            userDeltaRef.received = false;
            onMessage.onDone("user");
        } else if (msg.type === "session.created") {
            // No need to do anything, we optimistically updated the UI on start()
        } else if (msg.type === "error") {
            console.error(
                "[Realtime] provider error:",
                JSON.stringify(msg.error),
            );
        }
    } catch (e) {
        console.error("[Realtime] Failed to parse event:", e);
    }
}
