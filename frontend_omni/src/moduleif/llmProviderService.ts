/**
 * LLM Provider Service Module Interface
 *
 * This module provides interfaces and types for the LLM provider service.
 * It defines the core data structures, API contracts, and service interface
 * for managing LLM providers and models across different provider types.
 */

import { createContext, useContext } from "react";

// Core data structures
export interface Provider {
    id: string
    name: string
    url: string
    api_key: string
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

// Request/Response types
export interface CreateProviderRequest {
    name: string
    base_url: string
    api_key: string
    properties: Record<string, any>
}

export interface UpdateProviderRequest {
    name: string
    base_url: string
    api_key: string
    properties: Record<string, any>
}

export interface ApiErrorResponse {
    message: string
    error_code: string
    details?: Record<string, any>
}

// Extended provider type with models
export interface ProviderWithModels extends Provider {
    models?: Model[]
}

export interface ProviderTypeGroup {
    type: ProviderType
    label: string
    providers: ProviderWithModels[]
}

// Legacy interfaces for backward compatibility
export interface LLMProvider {
    id: string
    name: string
    base_url: string
    api_key: string
    created_at: string
    updated_at: string
}

export interface CreateLegacyProviderRequest {
    name: string
    base_url: string
    api_key: string
}

export interface UpdateLegacyProviderRequest {
    name: string
    base_url: string
    api_key: string
}

export interface ProvidersListResponse {
    providers: LLMProvider[]
}

// Service interface
export interface ProviderService {
    // Modern API methods
    getProviders(providerType: ProviderType | string): Promise<ProvidersResponse>
    getProvider(providerType: ProviderType | string, providerId: string): Promise<Provider>
    getModels(providerType: ProviderType | string, providerId: string): Promise<ModelsResponse>
    getAllProvidersWithModels(): Promise<ProviderTypeGroup[]>
    createProvider(providerType: ProviderType | string, data: CreateProviderRequest): Promise<Provider>
    updateProvider(providerType: ProviderType | string, providerId: string, data: UpdateProviderRequest): Promise<Provider>
    deleteProvider(providerType: ProviderType | string, providerId: string): Promise<void>

    // Legacy compatibility methods
    getLegacyProviders(): Promise<LLMProvider[]>
    createLegacyProvider(provider: CreateLegacyProviderRequest): Promise<LLMProvider>
    updateLegacyProvider(providerId: string, provider: UpdateLegacyProviderRequest): Promise<LLMProvider>
    deleteLegacyProvider(providerId: string): Promise<void>
}

// Create context for the LLM provider service
export const LLMProviderServiceContext = createContext<ProviderService | undefined>(undefined);

/**
 * Hook to access the LLM provider service from any component
 *
 * @returns ProviderService instance
 * @throws Error if used outside of LLMProviderServiceProvider
 */
export function useLLMProviderService(): ProviderService {
    const context = useContext(LLMProviderServiceContext);
    if (!context) {
        throw new Error('useLLMProviderService must be used within an LLMProviderServiceProvider');
    }
    return context;
}
