const LOCAL_STORAGE_KEY = "llm_providers";

export interface Provider {
	id: string;
	name: string;
	base_url: string;
	api_key: string;
	created_at: string;
	updated_at: string;
}

export interface ProviderModel {
	providerId: string;
	providerName: string;
	providerBaseUrl: string;
	providerApiKey: string;
	modelId: string;
	modelName: string;
	/** Compound key used in the model selector: `${providerId}/${modelId}` */
	selectId: string;
}

export interface CreateProviderRequest {
	name: string;
	base_url: string;
	api_key: string;
}

class LLMProviderService {
	providers = $state<Provider[]>([]);

	constructor() {
		this.#loadFromStorage();
	}

	#loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (stored) {
				this.providers = JSON.parse(stored) as Provider[];
			}
		} catch {
			this.providers = [];
		}
	}

	#saveToStorage(): void {
		try {
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.providers));
		} catch (error) {
			console.error("Failed to save providers to localStorage:", error);
		}
	}

	/**
	 * Fetch models from all configured providers in parallel.
	 * Routes through /api/models to avoid CORS issues in the browser.
	 * Unreachable providers are silently skipped.
	 */
	async fetchModels(): Promise<ProviderModel[]> {
		const results = await Promise.allSettled(
			this.providers.map(async (provider) => {
				const response = await fetch("/api/models", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						baseURL: provider.base_url,
						apiKey: provider.api_key,
					}),
				});
				if (!response.ok) return [] as ProviderModel[];
				const data = (await response.json()) as {
					data: { id: string }[];
				};
				return data.data.map((model) => ({
					providerId: provider.id,
					providerName: provider.name,
					providerBaseUrl: provider.base_url,
					providerApiKey: provider.api_key,
					modelId: model.id,
					modelName: model.id,
					selectId: `${provider.id}__${model.id}`,
				}));
			}),
		);

		return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
	}

	async checkProviderHealth(providerId: string): Promise<number> {
		const provider = this.providers.find((p) => p.id === providerId);
		if (!provider) {
			return 404;
		}

		try {
			const response = await fetch("/api/provider-health", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseURL: provider.base_url,
					apiKey: provider.api_key,
				}),
			});
			return response.status;
		} catch {
			return 502;
		}
	}

	createProvider(data: CreateProviderRequest): Provider {
		if (this.providers.some((p) => p.name === data.name)) {
			throw new Error(`Provider '${data.name}' already exists`);
		}
		const now = new Date().toISOString();
		const provider: Provider = {
			id: `provider_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
			name: data.name,
			base_url: data.base_url,
			api_key: data.api_key,
			created_at: now,
			updated_at: now,
		};
		this.providers = [...this.providers, provider];
		this.#saveToStorage();
		return provider;
	}

	updateProvider(id: string, data: Partial<CreateProviderRequest>): Provider {
		const idx = this.providers.findIndex((p) => p.id === id);
		if (idx === -1) throw new Error(`Provider not found: ${id}`);
		if (
			data.name &&
			this.providers.some((p) => p.name === data.name && p.id !== id)
		) {
			throw new Error(`Provider '${data.name}' already exists`);
		}
		const updated: Provider = {
			...this.providers[idx],
			...data,
			updated_at: new Date().toISOString(),
		};
		this.providers = this.providers.map((p, i) => (i === idx ? updated : p));
		this.#saveToStorage();
		return updated;
	}

	deleteProvider(id: string): void {
		this.providers = this.providers.filter((p) => p.id !== id);
		this.#saveToStorage();
	}
}

export const llmProviderService = new LLMProviderService();
