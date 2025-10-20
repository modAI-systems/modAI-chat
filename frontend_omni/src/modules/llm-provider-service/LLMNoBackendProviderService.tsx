/**
 * LLM No Backend Provider Service
 *
 * A provider service implementation that doesn't rely on a backend.
 * Providers are managed locally and persisted in localStorage.
 * Models are fetched directly from provider APIs.
 */

import {
    type CreateProviderRequest,
    LLMProviderServiceContext,
    type Model,
    type Provider,
    type ProviderService,
    type ProviderType,
    type UpdateProviderRequest,
} from ".";

interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

const LOCAL_STORAGE_KEY = "llm_providers";

class LLMNoBackendProviderService implements ProviderService {
    private providers: Provider[] = [];

    constructor() {
        this.loadProvidersFromLocalStorage();
    }

    private loadProvidersFromLocalStorage(): void {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                this.providers = JSON.parse(stored);
            }
        } catch (error) {
            console.error("Failed to load providers from localStorage:", error);
            this.providers = [];
        }
    }

    private saveProvidersToLocalStorage(): void {
        try {
            localStorage.setItem(
                LOCAL_STORAGE_KEY,
                JSON.stringify(this.providers),
            );
        } catch (error) {
            console.error("Failed to save providers to localStorage:", error);
        }
    }

    /**
     * Get all providers for a specific provider type
     */
    async getProviders(
        providerType: ProviderType | string,
    ): Promise<Provider[]> {
        const typeValue =
            typeof providerType === "string"
                ? providerType
                : providerType.value;

        return this.providers.filter((provider) => provider.type === typeValue);
    }

    /**
     * Get a specific provider by ID
     */
    async getProvider(
        providerType: ProviderType | string,
        providerId: string,
    ): Promise<Provider | null> {
        const typeValue =
            typeof providerType === "string"
                ? providerType
                : providerType.value;

        return (
            this.providers.find(
                (provider) =>
                    provider.type === typeValue && provider.id === providerId,
            ) || null
        );
    }

    /**
     * Get available models for a specific provider
     */
    async getModels(
        providerType: ProviderType | string,
        providerId: string,
    ): Promise<Model[]> {
        const provider = await this.getProvider(providerType, providerId);
        if (!provider) {
            return [];
        }

        const response = await fetch(`${provider.url}/models`, {
            headers: {
                Authorization: `Bearer ${provider.api_key}`,
            },
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch models: ${response.status} ${response.statusText}`,
            );
        }

        const data = await response.json();
        // Map OpenAI-style models to our Model interface
        // This assumes the API returns { data: [{ id: string, ... }] }
        return data.data.map((model: OpenAIModel) => ({
            id: model.id,
            name: model.id, // Use id as name
            description: `${provider.name} model: ${model.id}`,
            context_length: 4096, // Default, could be mapped if available
            supports_streaming: true, // Assume true for most providers
            supports_functions:
                model.id.includes("gpt-4") || model.id.includes("gpt-3.5"), // Rough check for OpenAI
        }));
    }

    /**
     * Create a new provider
     */
    async createProvider(
        providerType: ProviderType | string,
        data: CreateProviderRequest,
    ): Promise<Provider> {
        const typeValue =
            typeof providerType === "string"
                ? providerType
                : providerType.value;

        const now = new Date().toISOString();
        const newProvider: Provider = {
            id: `llm_${typeValue}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: typeValue,
            name: data.name,
            url: data.base_url,
            api_key: data.api_key,
            properties: data.properties || {},
            created_at: now,
            updated_at: now,
        };

        this.providers.push(newProvider);
        this.saveProvidersToLocalStorage();

        return newProvider;
    }

    /**
     * Update an existing provider
     */
    async updateProvider(
        providerType: ProviderType | string,
        providerId: string,
        data: UpdateProviderRequest,
    ): Promise<Provider> {
        const typeValue =
            typeof providerType === "string"
                ? providerType
                : providerType.value;

        const providerIndex = this.providers.findIndex(
            (provider) =>
                provider.type === typeValue && provider.id === providerId,
        );

        if (providerIndex === -1) {
            throw new Error(`Provider not found: ${providerId}`);
        }

        const provider = this.providers[providerIndex];
        const updatedProvider: Provider = {
            ...provider,
            name: data.name,
            url: data.base_url,
            api_key: data.api_key,
            properties: data.properties,
            updated_at: new Date().toISOString(),
        };

        this.providers[providerIndex] = updatedProvider;
        this.saveProvidersToLocalStorage();

        return updatedProvider;
    }

    /**
     * Delete a provider
     */
    async deleteProvider(
        providerType: ProviderType | string,
        providerId: string,
    ): Promise<void> {
        const typeValue =
            typeof providerType === "string"
                ? providerType
                : providerType.value;

        const providerIndex = this.providers.findIndex(
            (provider) =>
                provider.type === typeValue && provider.id === providerId,
        );

        if (providerIndex === -1) {
            return;
        }

        this.providers.splice(providerIndex, 1);
        this.saveProvidersToLocalStorage();
    }
}

/**
 * Context provider that makes the LLM provider service available
 * throughout the application component tree
 */
export default function LLMNoBackendProviderServiceContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const llmProviderServiceInstance = new LLMNoBackendProviderService();

    return (
        <LLMProviderServiceContext value={llmProviderServiceInstance}>
            {children}
        </LLMProviderServiceContext>
    );
}
