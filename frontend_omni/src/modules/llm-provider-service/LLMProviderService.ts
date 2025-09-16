/**
 * LLM Provider Service
 *
 * Service for interacting with the backend REST API for LLM providers and models.
 * This service handles all HTTP requests and provides a clean interface for
 * managing providers and models across different provider types.
 */

import type {
    Provider,
    ProvidersResponse,
    ModelsResponse,
    ProviderType,
    ProviderTypeGroup,
    CreateProviderRequest,
    UpdateProviderRequest,
    ApiErrorResponse,
    LLMProvider,
    CreateLegacyProviderRequest,
    UpdateLegacyProviderRequest,
    ProviderService as IProviderService
} from "@/moduleif/llmProviderService"

// Provider type mapping - maps to backend provider types
export const PROVIDER_TYPES: ProviderType[] = [
    { value: 'openai', label: 'OpenAI' }
] as const

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`

        try {
            const errorBody: ApiErrorResponse = await response.json()
            errorMessage = errorBody.message || errorMessage
        } catch {
            // If parsing error response fails, use default message
        }

        throw new Error(errorMessage)
    }

    // Handle 204 No Content for delete operations
    if (response.status === 204) {
        return undefined as T
    }

    return await response.json()
}

class LLMProviderService implements IProviderService {
    /**
     * Get all providers for a specific provider type
     */
    async getProviders(providerType: ProviderType | string): Promise<ProvidersResponse> {
        const typeValue = typeof providerType === 'string' ? providerType : providerType.value
        const response = await fetch(`/api/v1/llm-provider/${typeValue}`)

        if (!response.ok) {
            throw new Error(`Failed to fetch providers: ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Get a specific provider by ID
     */
    async getProvider(providerType: ProviderType | string, providerId: string): Promise<Provider> {
        const typeValue = typeof providerType === 'string' ? providerType : providerType.value
        const response = await fetch(`/api/v1/llm-provider/${typeValue}/${providerId}`)

        if (!response.ok) {
            throw new Error(`Failed to fetch provider: ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Get available models for a specific provider
     */
    async getModels(providerType: ProviderType | string, providerId: string): Promise<ModelsResponse> {
        const typeValue = typeof providerType === 'string' ? providerType : providerType.value
        const response = await fetch(`/api/v1/llm-provider/${typeValue}/${providerId}/models`)

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Get all available provider types with their configured providers
     */
    async getAllProvidersWithModels(): Promise<ProviderTypeGroup[]> {
        const result = []

        for (const providerType of PROVIDER_TYPES) {
            try {
                const providersResponse = await this.getProviders(providerType)
                const providersWithModels = []

                for (const provider of providersResponse.providers) {
                    try {
                        const modelsResponse = await this.getModels(providerType, provider.id)
                        providersWithModels.push({
                            ...provider,
                            models: modelsResponse.models
                        })
                    } catch (error) {
                        console.warn(`Failed to fetch models for provider ${provider.id}:`, error)
                        providersWithModels.push(provider)
                    }
                }

                result.push({
                    type: providerType,
                    label: providerType.label,
                    providers: providersWithModels
                })
            } catch (error) {
                console.warn(`Failed to fetch providers for type ${providerType.value}:`, error)
                result.push({
                    type: providerType,
                    label: providerType.label,
                    providers: []
                })
            }
        }

        return result
    }

    /**
     * Create a new provider
     */
    async createProvider(
        providerType: ProviderType | string,
        data: CreateProviderRequest
    ): Promise<Provider> {
        const typeValue = typeof providerType === 'string' ? providerType : providerType.value
        const response = await fetch(`/api/v1/llm-provider/${typeValue}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        return await handleResponse<Provider>(response)
    }

    /**
     * Update an existing provider
     */
    async updateProvider(
        providerType: ProviderType | string,
        providerId: string,
        data: UpdateProviderRequest
    ): Promise<Provider> {
        const typeValue = typeof providerType === 'string' ? providerType : providerType.value
        const response = await fetch(`/api/v1/llm-provider/${typeValue}/${providerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        return await handleResponse<Provider>(response)
    }

    /**
     * Delete a provider
     */
    async deleteProvider(providerType: ProviderType | string, providerId: string): Promise<void> {
        const typeValue = typeof providerType === 'string' ? providerType : providerType.value
        const response = await fetch(`/api/v1/llm-provider/${typeValue}/${providerId}`, {
            method: 'DELETE'
        })

        await handleResponse<void>(response)
    }

    // Legacy compatibility methods for backward compatibility with llmProviderService

    /**
     * Legacy method: Get OpenAI providers (for backward compatibility)
     */
    async getLegacyProviders(): Promise<LLMProvider[]> {
        const response = await fetch('/api/v1/llm-provider/openai')

        if (!response.ok) {
            throw new Error(`Failed to fetch legacy providers: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // The backend already returns data in the LLMProvider format
        return data.providers.map((provider: any) => ({
            id: provider.id,
            name: provider.name,
            base_url: provider.base_url,
            api_key: provider.api_key,
            created_at: provider.created_at || '',
            updated_at: provider.updated_at || ''
        }))
    }

    /**
     * Legacy method: Create OpenAI provider (for backward compatibility)
     */
    async createLegacyProvider(provider: CreateLegacyProviderRequest): Promise<LLMProvider> {
        const result = await this.createProvider('openai', {
            name: provider.name,
            url: provider.base_url,
            properties: { api_key: provider.api_key }
        })

        return {
            id: result.id,
            name: result.name,
            base_url: result.url,
            api_key: result.properties.api_key || '',
            created_at: result.created_at || '',
            updated_at: result.updated_at || ''
        }
    }

    /**
     * Legacy method: Update OpenAI provider (for backward compatibility)
     */
    async updateLegacyProvider(providerId: string, provider: UpdateLegacyProviderRequest): Promise<LLMProvider> {
        const result = await this.updateProvider('openai', providerId, {
            name: provider.name,
            url: provider.base_url,
            properties: { api_key: provider.api_key }
        })

        return {
            id: result.id,
            name: result.name,
            base_url: result.url,
            api_key: result.properties.api_key || '',
            created_at: result.created_at || '',
            updated_at: result.updated_at || ''
        }
    }

    /**
     * Legacy method: Delete OpenAI provider (for backward compatibility)
     */
    async deleteLegacyProvider(providerId: string): Promise<void> {
        await this.deleteProvider('openai', providerId)
    }
}

export const llmProviderService = new LLMProviderService()

// Legacy functional API for backward compatibility
export async function getProviders(): Promise<LLMProvider[]> {
    return await llmProviderService.getLegacyProviders()
}

export async function createProvider(provider: CreateLegacyProviderRequest): Promise<LLMProvider> {
    return await llmProviderService.createLegacyProvider(provider)
}

export async function updateProvider(providerId: string, provider: UpdateLegacyProviderRequest): Promise<LLMProvider> {
    return await llmProviderService.updateLegacyProvider(providerId, provider)
}

export async function deleteProvider(providerId: string): Promise<void> {
    await llmProviderService.deleteLegacyProvider(providerId)
}
