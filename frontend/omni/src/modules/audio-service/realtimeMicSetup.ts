import { WORKLET_CODE } from "./realtimeConfig.js";

export async function loadAudioWorklet(ctx: AudioContext): Promise<void> {
    const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(blobUrl);
    URL.revokeObjectURL(blobUrl);
}

export function connectMicToWorklet(
    ctx: AudioContext,
    micStream: MediaStream,
    sendAudio: (payload: string) => void,
): void {
    const micSource = ctx.createMediaStreamSource(micStream);
    const workletNode = new AudioWorkletNode(ctx, "pcm16-processor");

    workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        const bytes = new Uint8Array(e.data);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        sendAudio(
            JSON.stringify({
                type: "input_audio_buffer.append",
                audio: btoa(binary),
            }),
        );
    };

    const silentOut = ctx.createGain();
    silentOut.gain.value = 0;
    silentOut.connect(ctx.destination);
    micSource.connect(workletNode);
    workletNode.connect(silentOut);
}
