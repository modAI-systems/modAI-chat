/**
 * Service for fetching LLM providers and models from the backend API
 */

export interface Provider {
    id: string
    name: string
    url: string
    properties: Record<string, any>
    created_at: string | null
    updated_at: string | null
}

export interface ProvidersResponse {
    providers: Provider[]
    total: number
    limit: number | null
    offset: number | null
}

export interface Model {
    id: string
    name: string
    description: string
    context_length: number
    supports_streaming: boolean
    supports_functions: boolean
}

export interface ModelsResponse {
    provider_id: string
    models: Model[]
}

export interface ProviderType {
    value: string
    label: string
}

// Provider type mapping - maps to backend provider types
export const PROVIDER_TYPES: ProviderType[] = [
    { value: 'openai', label: 'OpenAI' }
] as const

// Legacy interfaces for backward compatibility
export interface LLMProvider {
    id: string
    name: string
    base_url: string
    api_key: string
    created_at: string
    updated_at: string
}

export interface CreateProviderRequest {
    name: string
    base_url: string
    api_key: string
}

export interface UpdateProviderRequest {
    name: string
    base_url: string
    api_key: string
}

export interface ProvidersListResponse {
    providers: LLMProvider[]
}

export interface ApiErrorResponse {
    message: string
    error_code: string
    details?: Record<string, any>
}

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

class ProviderService {
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
    async getAllProvidersWithModels(): Promise<Array<{
        type: ProviderType
        label: string
        providers: Array<Provider & { models?: Model[] }>
    }>> {
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
        data: {
            name: string
            url: string
            properties: Record<string, any>
        }
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
        data: {
            name: string
            url: string
            properties: Record<string, any>
        }
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
        const response = await this.getProviders('openai')
        return response.providers.map(provider => ({
            id: provider.id,
            name: provider.name,
            base_url: provider.url,
            api_key: provider.properties.api_key || '',
            created_at: provider.created_at || '',
            updated_at: provider.updated_at || ''
        }))
    }

    /**
     * Legacy method: Create OpenAI provider (for backward compatibility)
     */
    async createLegacyProvider(provider: CreateProviderRequest): Promise<LLMProvider> {
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
    async updateLegacyProvider(providerId: string, provider: UpdateProviderRequest): Promise<LLMProvider> {
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

export const providerService = new ProviderService()

// Legacy functional API for backward compatibility
export async function getProviders(): Promise<LLMProvider[]> {
    return await providerService.getLegacyProviders()
}

export async function createProvider(provider: CreateProviderRequest): Promise<LLMProvider> {
    return await providerService.createLegacyProvider(provider)
}

export async function updateProvider(providerId: string, provider: UpdateProviderRequest): Promise<LLMProvider> {
    return await providerService.updateLegacyProvider(providerId, provider)
}

export async function deleteProvider(providerId: string): Promise<void> {
    await providerService.deleteLegacyProvider(providerId)
}
