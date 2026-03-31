import type {
    CreateProviderRequest,
    LLMProviderService,
    Provider,
    ProviderModel,
} from "./index.svelte.js";

const API_BASE = "/api/models/providers/openai";

type BackendProvider = {
    id: string;
    type: string;
    name: string;
    base_url: string;
    api_key: string;
    properties: Record<string, unknown>;
    created_at: string | null;
    updated_at: string | null;
};

type BackendProviderListResponse = {
    providers: BackendProvider[];
    total: number;
    limit: number | null;
    offset: number | null;
};

type BackendModelsResponse = {
    object: string;
    data: { id: string; object: string; created: number; owned_by: string }[];
};

function mapProvider(p: BackendProvider): Provider {
    return {
        id: p.id,
        name: p.name,
        base_url: p.base_url,
        api_key: p.api_key,
        created_at: p.created_at ?? new Date().toISOString(),
        updated_at: p.updated_at ?? new Date().toISOString(),
    };
}

export class ModaiBackendLLMProviderService implements LLMProviderService {
    async fetchProviders(): Promise<Provider[]> {
        const response = await fetch(API_BASE, { credentials: "include" });
        if (!response.ok) return [];
        const data = (await response.json()) as BackendProviderListResponse;
        return data.providers.map(mapProvider);
    }

    async fetchModels(provider: Provider): Promise<ProviderModel[]> {
        const response = await fetch(`${API_BASE}/${provider.id}/models`, {
            credentials: "include",
        });
        if (!response.ok) return [];
        const data = (await response.json()) as BackendModelsResponse;
        return data.data.map((model) => ({
            providerId: provider.id,
            providerName: provider.name,
            providerBaseUrl: provider.base_url,
            providerApiKey: provider.api_key,
            modelId: model.id,
            modelName: model.id,
        }));
    }

    async createProvider(data: CreateProviderRequest): Promise<Provider> {
        const response = await fetch(API_BASE, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(
                `Failed to create provider: ${response.statusText}`,
            );
        }
        const created = (await response.json()) as BackendProvider;
        return mapProvider(created);
    }

    async updateProvider(
        id: string,
        data: Partial<CreateProviderRequest>,
    ): Promise<Provider> {
        const getResponse = await fetch(`${API_BASE}/${id}`, {
            credentials: "include",
        });
        if (!getResponse.ok) throw new Error(`Provider not found: ${id}`);
        const current = (await getResponse.json()) as BackendProvider;

        const updateBody = {
            name: data.name ?? current.name,
            base_url: data.base_url ?? current.base_url,
            api_key: data.api_key ?? current.api_key,
            properties: current.properties,
        };

        const response = await fetch(`${API_BASE}/${id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateBody),
        });
        if (!response.ok) {
            throw new Error(
                `Failed to update provider: ${response.statusText}`,
            );
        }
        const updated = (await response.json()) as BackendProvider;
        return mapProvider(updated);
    }

    async deleteProvider(id: string): Promise<void> {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error(
                `Failed to delete provider: ${response.statusText}`,
            );
        }
    }
}

export default new ModaiBackendLLMProviderService();
