import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageLLMProviderService } from "./localStorageLLMProviderService.svelte";

describe("LocalStorageLLMProviderService", () => {
    let service: LocalStorageLLMProviderService;

    beforeEach(() => {
        localStorage.clear();
        service = new LocalStorageLLMProviderService();
        vi.restoreAllMocks();
    });

    it("fetches models directly from each provider /models endpoint", async () => {
        const provider = service.createProvider({
            name: "provider-a",
            base_url: "https://example.test/",
            api_key: "secret",
        });
        const fetchMock = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({ data: [{ id: "gpt-4o-mini" }] }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                ),
        );
        vi.stubGlobal("fetch", fetchMock);

        const models = await service.fetchModels(provider);

        expect(fetchMock).toHaveBeenCalledWith("https://example.test/models", {
            headers: { Authorization: "Bearer secret" },
        });
        expect(models).toEqual([
            {
                providerId: provider.id,
                providerName: "provider-a",
                providerBaseUrl: "https://example.test/",
                providerApiKey: "secret",
                modelId: "gpt-4o-mini",
                modelName: "gpt-4o-mini",
            },
        ]);
    });

    it("returns empty array when provider /models endpoint is unreachable", async () => {
        const provider = service.createProvider({
            name: "provider-b",
            base_url: "https://unreachable.test",
            api_key: "",
        });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("network failure")),
        );

        const models = await service.fetchModels(provider);

        expect(models).toEqual([]);
    });
});
