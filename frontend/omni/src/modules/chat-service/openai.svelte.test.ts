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

vi.mock("ai", () => ({
    streamText: (...args: unknown[]) => streamTextMock(...args),
    convertToModelMessages: (...args: unknown[]) =>
        convertToModelMessagesMock(...args),
}));

describe("OpenAIChatService", () => {
    const model: ProviderModel = {
        providerId: "provider-1",
        providerName: "provider",
        providerBaseUrl: "/api",
        providerApiKey: "",
        modelId: "provider/model",
        modelName: "model",
    };

    beforeEach(() => {
        vi.restoreAllMocks();
        createOpenAIMock.mockReset();
        streamTextMock.mockReset();
        convertToModelMessagesMock.mockReset();
        convertToModelMessagesMock.mockResolvedValue([]);
    });

    it("adds selected tools to /responses request body", async () => {
        const fetchService: FetchService = {
            fetch: vi
                .fn()
                .mockResolvedValue(
                    new Response(JSON.stringify({}), { status: 200 }),
                ),
        };

        createOpenAIMock.mockImplementation(
            (config: { fetch: FetchService["fetch"] }) => {
                return (modelId: string) => ({ modelId, fetch: config.fetch });
            },
        );

        streamTextMock.mockImplementation(
            ({
                model: openaiModel,
            }: {
                model: { fetch: FetchService["fetch"] };
            }) => ({
                textStream: (async function* () {
                    await openaiModel.fetch("/api/responses", {
                        method: "POST",
                        body: JSON.stringify({
                            model: "provider/model",
                            input: [],
                        }),
                    });
                    yield "ok";
                })(),
            }),
        );

        const service = create({
            getOne<T>(name: string): T {
                if (name === "fetchService") {
                    return fetchService as T;
                }
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
                    },
                },
            ],
        )) {
            chunks.push(chunk);
        }

        expect(chunks).toEqual(["ok"]);
        expect(fetchService.fetch).toHaveBeenCalledTimes(1);

        const [, request] = vi.mocked(fetchService.fetch).mock.calls[0];
        const body = JSON.parse(String(request?.body));
        expect(body.tools).toEqual([
            {
                type: "function",
                function: {
                    name: "calculate",
                },
            },
        ]);
    });

    it("keeps request unchanged when no tools are selected", async () => {
        const fetchService: FetchService = {
            fetch: vi
                .fn()
                .mockResolvedValue(
                    new Response(JSON.stringify({}), { status: 200 }),
                ),
        };

        createOpenAIMock.mockImplementation(
            (config: { fetch: FetchService["fetch"] }) => {
                return (modelId: string) => ({ modelId, fetch: config.fetch });
            },
        );

        streamTextMock.mockImplementation(
            ({
                model: openaiModel,
            }: {
                model: { fetch: FetchService["fetch"] };
            }) => ({
                textStream: (async function* () {
                    await openaiModel.fetch("/api/responses", {
                        method: "POST",
                        body: JSON.stringify({
                            model: "provider/model",
                            input: [],
                        }),
                    });
                    yield "ok";
                })(),
            }),
        );

        const service = create({
            getOne<T>(name: string): T {
                if (name === "fetchService") {
                    return fetchService as T;
                }
                throw new Error(`Unknown dependency: ${name}`);
            },
            getAll<T>(): T[] {
                return [];
            },
        });

        for await (const _chunk of service.streamChat(model, [])) {
        }

        const [, request] = vi.mocked(fetchService.fetch).mock.calls[0];
        const body = JSON.parse(String(request?.body));
        expect(body.tools).toBeUndefined();
    });
});
