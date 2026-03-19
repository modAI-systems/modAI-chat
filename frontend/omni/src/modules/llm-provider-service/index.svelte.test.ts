import { beforeEach, describe, expect, it, vi } from "vitest";
import { llmProviderService } from "./index.svelte";

describe("llmProviderService", () => {
	beforeEach(() => {
		llmProviderService.providers = [];
		localStorage.removeItem("llm_providers");
		vi.restoreAllMocks();
	});

	it("fetches models directly from each provider /models endpoint", async () => {
		const provider = llmProviderService.createProvider({
			name: "provider-a",
			base_url: "https://example.test/",
			api_key: "secret",
		});
		const fetchMock = vi.fn(
			async () =>
				new Response(JSON.stringify({ data: [{ id: "gpt-4o-mini" }] }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const models = await llmProviderService.fetchModels();

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
				selectId: `${provider.id}__gpt-4o-mini`,
			},
		]);
	});

	it("checks provider health directly via provider /health endpoint", async () => {
		const provider = llmProviderService.createProvider({
			name: "provider-b",
			base_url: "https://health.test",
			api_key: "token",
		});
		const fetchMock = vi.fn(async () => new Response("ok", { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		const status = await llmProviderService.checkProviderHealth(provider.id);

		expect(fetchMock).toHaveBeenCalledWith("https://health.test/health", {
			headers: { Authorization: "Bearer token" },
		});
		expect(status).toBe(204);
	});
});
