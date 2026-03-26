import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatService } from "@/modules/chat-service/index.svelte.ts";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.ts";
import type { ConversationService } from "./index.svelte.ts";

let mockChatService: ChatService;

vi.mock("@/modules/chat-service/index.svelte.ts", () => ({
    getChatService: () => mockChatService,
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

function createMockChatService(
    streamFn?: ChatService["streamChat"],
): ChatService {
    return {
        streamChat:
            streamFn ??
            async function* () {
                /* empty */
            },
    };
}

describe("OpenAIConversationService", () => {
    let conversationService: ConversationService;

    beforeEach(async () => {
        mockChatService = createMockChatService();
        vi.resetModules();
        const mod = await import("./openai.svelte.ts");
        conversationService = mod.default;
    });

    it("creates a conversation with empty messages and ready status", () => {
        const conversation = conversationService.createConversation();
        expect(conversation.messages).toEqual([]);
        expect(conversation.status).toBe("ready");
    });

    it("adds user and assistant messages on send", async () => {
        mockChatService = createMockChatService(async function* () {
            yield "Hello!";
        });
        const conversation = conversationService.createConversation();

        await conversation.send("Hi", model);

        expect(conversation.messages).toHaveLength(2);
        expect(conversation.messages[0].role).toBe("user");
        expect(conversation.messages[0].parts).toEqual([
            { type: "text", text: "Hi" },
        ]);
        expect(conversation.messages[1].role).toBe("assistant");
    });

    it("accumulates streamed text in the assistant message", async () => {
        mockChatService = createMockChatService(async function* () {
            yield "Hello, ";
            yield "world!";
        });
        const conversation = conversationService.createConversation();

        await conversation.send("Hi", model);

        const assistantText = conversation.messages[1].parts.find(
            (p) => p.type === "text",
        );
        expect(assistantText).toEqual({ type: "text", text: "Hello, world!" });
    });

    it("returns to ready status after successful send", async () => {
        mockChatService = createMockChatService(async function* () {
            yield "done";
        });
        const conversation = conversationService.createConversation();

        await conversation.send("Hi", model);

        expect(conversation.status).toBe("ready");
    });

    it("sets error message on assistant when stream fails", async () => {
        mockChatService = createMockChatService(async function* () {
            yield "partial";
            throw new Error("connection reset");
        });
        const conversation = conversationService.createConversation();

        await conversation.send("Hi", model);

        expect(conversation.messages).toHaveLength(2);
        const assistantText = conversation.messages[1].parts.find(
            (p) => p.type === "text",
        );
        expect(assistantText?.text).toContain(
            "Could not reach the selected provider",
        );
        expect(conversation.status).toBe("ready");
    });

    it("passes tools to the chat service", async () => {
        const streamChat = vi.fn(async function* () {
            yield "ok";
        });
        mockChatService = createMockChatService(streamChat);
        const conversation = conversationService.createConversation();
        const tools = [
            {
                name: "test",
                description: "test tool",
                parameters: {},
            },
        ];

        await conversation.send("Hi", model, tools);

        expect(streamChat).toHaveBeenCalledWith(
            model,
            expect.arrayContaining([expect.objectContaining({ role: "user" })]),
            tools,
        );
    });

    it("preserves previous messages across multiple sends", async () => {
        mockChatService = createMockChatService(async function* () {
            yield "response";
        });
        const conversation = conversationService.createConversation();

        await conversation.send("First", model);
        await conversation.send("Second", model);

        expect(conversation.messages).toHaveLength(4);
        expect(conversation.messages[0].parts).toEqual([
            { type: "text", text: "First" },
        ]);
        expect(conversation.messages[2].parts).toEqual([
            { type: "text", text: "Second" },
        ]);
    });
});
