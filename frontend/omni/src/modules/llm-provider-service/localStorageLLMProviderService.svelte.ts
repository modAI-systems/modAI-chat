import type { Modules } from "@/core/module-system/index.js";
import type {
    CreateProviderRequest,
    LLMProviderService,
    Provider,
    ProviderModel,
} from "./index.svelte.js";

const LOCAL_STORAGE_KEY = "llm_providers";

export class LocalStorageLLMProviderService implements LLMProviderService {
    async fetchProviders(_modules: Modules): Promise<Provider[]> {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            return stored ? (JSON.parse(stored) as Provider[]) : [];
        } catch {
            return [];
        }
    }

    #save(providers: Provider[]): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(providers));
        } catch (error) {
            console.error("Failed to save providers to localStorage:", error);
        }
    }

    /**
     * Fetch available models for the given provider.
     * Calls the provider's /models endpoint directly from the browser.
     * Returns an empty array if the provider is unreachable or returns an error.
     */
    async fetchModels(
        _modules: Modules,
        provider: Provider,
    ): Promise<ProviderModel[]> {
        try {
            const response = await fetch(
                `${trimTrailingSlash(provider.base_url)}/models`,
                {
                    headers: provider.api_key
                        ? { Authorization: `Bearer ${provider.api_key}` }
                        : undefined,
                },
            );
            if (!response.ok) return [];
            const data = (await response.json()) as {
                data?: { id: string }[];
            };
            return (data.data ?? []).map((model) => ({
                providerId: provider.id,
                providerName: provider.name,
                providerBaseUrl: provider.base_url,
                providerApiKey: provider.api_key,
                modelId: model.id,
                modelName: model.id,
            }));
        } catch {
            return [];
        }
    }

    async createProvider(
        _modules: Modules,
        data: CreateProviderRequest,
    ): Promise<Provider> {
        const providers = await this.fetchProviders(_modules);
        if (providers.some((p) => p.name === data.name)) {
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
        this.#save([...providers, provider]);
        return provider;
    }

    async updateProvider(
        _modules: Modules,
        id: string,
        data: Partial<CreateProviderRequest>,
    ): Promise<Provider> {
        const providers = await this.fetchProviders(_modules);
        const idx = providers.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error(`Provider not found: ${id}`);
        if (
            data.name &&
            providers.some((p) => p.name === data.name && p.id !== id)
        ) {
            throw new Error(`Provider '${data.name}' already exists`);
        }
        const updated: Provider = {
            ...providers[idx],
            ...data,
            updated_at: new Date().toISOString(),
        };
        this.#save(providers.map((p, i) => (i === idx ? updated : p)));
        return updated;
    }

    async deleteProvider(_modules: Modules, id: string): Promise<void> {
        this.#save(
            (await this.fetchProviders(_modules)).filter((p) => p.id !== id),
        );
    }
}

function trimTrailingSlash(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default new LocalStorageLLMProviderService();
