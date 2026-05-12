/** AudioWorklet processor source code (loaded via Blob URL). */
export const WORKLET_CODE = `
class PCM16Processor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    const int16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, channel[i] * 32767 | 0));
    }
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}
registerProcessor('pcm16-processor', PCM16Processor);
`;

// Important to read: https://developers.openai.com/api/docs/guides/realtime-conversations#handling-audio-with-websockets

/** Builds the session.update payload with the configured transcript model. */
export function buildSessionUpdatePayload(transcriptModelName: string): string {
    return JSON.stringify({
        type: "session.update",
        session: {
            type: "realtime",
            output_modalities: ["audio"],
            instructions: "Respond very very very briefly.",
            audio: {
                input: {
                    format: { type: "audio/pcm", rate: 24000 },
                    ...(transcriptModelName
                        ? { transcription: { model: transcriptModelName } }
                        : {}),
                    turn_detection: { type: "semantic_vad" },
                },
                output: {
                    format: { type: "audio/pcm", rate: 24000 },
                    voice: "alloy",
                },
            },
        },
    });
}
