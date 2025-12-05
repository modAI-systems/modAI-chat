/**
 * LLM Provider Service
 *
 * Service for interacting with the backend REST API for LLM providers and models.
 * This service handles all HTTP requests and provides a clean interface for
 * managing providers and models across different provider types.
 */

import {
    type ApiErrorResponse,
    type CreateProviderRequest,
    LLMProviderServiceContext,
    type Model,
    type Provider,
    type ProviderService,
    type ProviderType,
    type UpdateProviderRequest,
} from ".";

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
            const errorBody: ApiErrorResponse = await response.json();
            errorMessage = errorBody.message || errorMessage;
        } catch {
            // If parsing error response fails, use default message
        }

        throw new Error(errorMessage);
    }

    // Handle 204 No Content for delete operations
    if (response.status === 204) {
        return undefined as T;
    }

    return await response.json();
}

class LLMRestProviderService implements ProviderService {
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
        const response = await fetch(`/api/v1/llm-provider/${typeValue}`);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch providers: ${response.status} ${response.statusText}`,
            );
        }

        const data = await response.json();
        return data.providers;
    }

    /**
     * Get a specific provider by ID
     */
    async getProvider(
        providerType: ProviderType | string,
        providerId: string,
    ): Promise<Provider> {
        const typeValue =
            typeof providerType === "string"
                ? providerType
                : providerType.value;
        const response = await fetch(
            `/api/v1/llm-provider/${typeValue}/${providerId}`,
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch provider: ${response.status} ${response.statusText}`,
            );
        }

        return response.json();
    }

    /**
     * Get available models for a specific provider
     */
    async getModels(
        providerType: ProviderType | string,
        providerId: string,
    ): Promise<Model[]> {
        const typeValue =
            typeof providerType === "string"
                ? providerType
                : providerType.value;
        const response = await fetch(
            `/api/v1/llm-provider/${typeValue}/${providerId}/models`,
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch models: ${response.status} ${response.statusText}`,
            );
        }

        return response.json();
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
        const response = await fetch(`/api/v1/llm-provider/${typeValue}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        return await handleResponse<Provider>(response);
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
        const response = await fetch(
            `/api/v1/llm-provider/${typeValue}/${providerId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            },
        );

        return await handleResponse<Provider>(response);
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
        const response = await fetch(
            `/api/v1/llm-provider/${typeValue}/${providerId}`,
            {
                method: "DELETE",
            },
        );

        await handleResponse<void>(response);
    }
}

/**
 * Context provider that makes the LLM provider service available
 * throughout the application component tree
 */
export default function LLMRestProviderServiceContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const llmProviderServiceInstance = new LLMRestProviderService();

    return (
        <LLMProviderServiceContext value={llmProviderServiceInstance}>
            {children}
        </LLMProviderServiceContext>
    );
}
