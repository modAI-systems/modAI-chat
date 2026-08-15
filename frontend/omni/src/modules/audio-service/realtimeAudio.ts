/**
 * Schedules a base64-encoded PCM16 audio chunk for playback via the Web Audio API.
 * Chunks are scheduled contiguously to avoid gaps between them.
 */
export function playAudioDelta(
    audioContext: AudioContext,
    base64: string,
    playbackTimeRef: { value: number },
): void {
    if (audioContext.state === "suspended") {
        void audioContext.resume();
    }
    // Decode base64 → PCM16 → Float32
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = audioContext.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    // Schedule contiguously so chunks play without gaps
    const startAt = Math.max(playbackTimeRef.value, audioContext.currentTime);
    source.start(startAt);
    playbackTimeRef.value = startAt + buffer.duration;
}
