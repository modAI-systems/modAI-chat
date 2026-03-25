import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import type { ChatService } from "./index.svelte.js";

vi.mock("@ai-sdk/openai", () => ({
    createOpenAI: vi.fn(),
}));

vi.mock("ai", () => ({
    convertToModelMessages: vi.fn(async (msgs: unknown) => msgs),
    streamText: vi.fn(),
}));

const model: ProviderModel = {
    providerId: "p1",
    providerName: "TestProvider",
    providerBaseUrl: "https://api.test.com/",
    providerApiKey: "test-key",
    modelId: "test-model",
    modelName: "Test Model",
    selectId: "p1__test-model",
};

const messages: UIMessage[] = [
    { id: "1", role: "user", parts: [{ type: "text", text: "Hi" }] },
];

async function* makeStream(...chunks: string[]) {
    for (const chunk of chunks) {
        yield chunk;
    }
}

describe("chatService", () => {
    let chatService: ChatService;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("./openai.svelte.js");
        chatService = mod.default;
        vi.clearAllMocks();
    });

    it("yields text chunks from the provider stream", async () => {
        const { streamText } = await import("ai");
        const { createOpenAI } = await import("@ai-sdk/openai");
        vi.mocked(createOpenAI).mockReturnValue(vi.fn() as never);
        vi.mocked(streamText).mockReturnValue({
            textStream: makeStream("Hello, ", "world!"),
        } as never);

        const chunks: string[] = [];
        for await (const chunk of chatService.streamChat(model, messages)) {
            chunks.push(chunk);
        }

        expect(chunks).toEqual(["Hello, ", "world!"]);
    });

    it("trims trailing slash from providerBaseUrl", async () => {
        const { streamText } = await import("ai");
        const { createOpenAI } = await import("@ai-sdk/openai");
        vi.mocked(createOpenAI).mockReturnValue(vi.fn() as never);
        vi.mocked(streamText).mockReturnValue({
            textStream: makeStream(),
        } as never);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of chatService.streamChat(model, [])) {
            /* drain */
        }

        expect(createOpenAI).toHaveBeenCalledWith(
            expect.objectContaining({ baseURL: "https://api.test.com" }),
        );
    });

    it("passes the correct model id to the provider factory", async () => {
        const { streamText } = await import("ai");
        const { createOpenAI } = await import("@ai-sdk/openai");
        const providerFactory = vi.fn();
        vi.mocked(createOpenAI).mockReturnValue(providerFactory as never);
        vi.mocked(streamText).mockReturnValue({
            textStream: makeStream(),
        } as never);

        for await (const _ of chatService.streamChat(model, [])) {
            /* drain */
        }

        expect(providerFactory).toHaveBeenCalledWith("test-model");
    });

    it("propagates errors thrown by the provider stream", async () => {
        const { streamText } = await import("ai");
        const { createOpenAI } = await import("@ai-sdk/openai");
        vi.mocked(createOpenAI).mockReturnValue(vi.fn() as never);

        async function* failingStream() {
            yield "partial";
            throw new Error("connection reset");
        }

        vi.mocked(streamText).mockReturnValue({
            textStream: failingStream(),
        } as never);

        const gen = chatService.streamChat(model, messages);
        await gen.next(); // consume "partial"
        await expect(gen.next()).rejects.toThrow("connection reset");
    });
});
