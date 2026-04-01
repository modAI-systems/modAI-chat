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
}

export interface CreateProviderRequest {
    name: string;
    base_url: string;
    api_key: string;
}

/**
 * Public interface for the LLM provider service.
 * Manages the list of configured LLM providers and their models.
 * Implementations live in sibling files (e.g. localStorageLLMProviderService.svelte.ts).
 */
export interface LLMProviderService {
    /** Returns all configured providers. */
    fetchProviders(): Promise<Provider[]>;
    /** Fetch available models for the given provider. */
    fetchModels(provider: Provider): Promise<ProviderModel[]>;
    createProvider(data: CreateProviderRequest): Promise<Provider>;
    updateProvider(
        id: string,
        data: Partial<CreateProviderRequest>,
    ): Promise<Provider>;
    deleteProvider(id: string): Promise<void>;
}
