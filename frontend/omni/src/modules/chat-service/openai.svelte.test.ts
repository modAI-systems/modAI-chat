import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchService } from "@/modules/fetch-service/index.svelte.js";
import type { ProviderModel } from "@/modules/llm-provider-service/index.svelte.js";
import { create } from "./openai.svelte";

const createOpenAIMock = vi.fn();
const streamTextMock = vi.fn();
const convertToModelMessagesMock = vi.fn();

vi.mock("@ai-sdk/openai", () => ({
    createOpenAI: (...args: unknown[]) => createOpenAIMock(...args),
}));

vi.mock("ai", async (importOriginal) => {
    const actual = await importOriginal<typeof import("ai")>();
    return {
        ...actual,
        streamText: (...args: unknown[]) => streamTextMock(...args),
        convertToModelMessages: (...args: unknown[]) =>
            convertToModelMessagesMock(...args),
    };
});

describe("OpenAIChatService", () => {
    const model: ProviderModel = {
        providerId: "provider-1",
        providerName: "provider",
        providerBaseUrl: "/api",
        providerApiKey: "",
        modelId: "provider/model",
        modelName: "model",
    };

    const fetchService: FetchService = {
        fetch: vi
            .fn()
            .mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            ),
    };

    beforeEach(() => {
        vi.restoreAllMocks();
        createOpenAIMock.mockReset();
        streamTextMock.mockReset();
        convertToModelMessagesMock.mockReset();
        convertToModelMessagesMock.mockResolvedValue([]);

        createOpenAIMock.mockReturnValue((modelId: string) => ({ modelId }));
        streamTextMock.mockReturnValue({
            textStream: (async function* () {
                yield "ok";
            })(),
        });
    });

    it("passes tools to streamText when tools are provided", async () => {
        const service = create({
            getOne<T>(name: string): T {
                if (name === "fetchService") return fetchService as T;
                throw new Error(`Unknown dependency: ${name}`);
            },
            getAll<T>(): T[] {
                return [];
            },
        });

        const chunks: string[] = [];
        for await (const chunk of service.streamChat(
            model,
            [],
            [
                {
                    type: "function",
                    function: {
                        name: "calculate",
                        description: "A calculator",
                        parameters: {
                            type: "object",
                            properties: { x: { type: "number" } },
                        },
                    },
                },
            ],
        )) {
            chunks.push(chunk);
        }

        expect(chunks).toEqual(["ok"]);

        const streamTextArgs = streamTextMock.mock.calls[0][0];
        expect(streamTextArgs.tools).toBeDefined();
        expect(Object.keys(streamTextArgs.tools)).toEqual(["calculate"]);
        expect(streamTextArgs.tools.calculate.description).toBe("A calculator");
    });

    it("does not pass tools to streamText when no tools are provided", async () => {
        const service = create({
            getOne<T>(name: string): T {
                if (name === "fetchService") return fetchService as T;
                throw new Error(`Unknown dependency: ${name}`);
            },
            getAll<T>(): T[] {
                return [];
            },
        });

        for await (const _chunk of service.streamChat(model, [])) {
        }

        const streamTextArgs = streamTextMock.mock.calls[0][0];
        expect(streamTextArgs.tools).toBeUndefined();
    });
});
