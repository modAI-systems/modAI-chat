/**
 * LLM Provider Management Module Interface
 *
 * This module provides interfaces and types for managing LLM providers in the UI.
 * It handles CRUD operations for providers and provider configuration management.
 */

import type {
    LLMProvider,
    CreateLegacyProviderRequest,
    UpdateLegacyProviderRequest
} from './llmProviderService'

// Provider management specific UI state types
export interface ProviderFormData {
    name: string
    base_url: string
    api_key: string
}

export interface ProviderManagementState {
    providers: LLMProvider[]
    loading: boolean
    saving: boolean
    error: string | null
    formMode: 'create' | 'edit' | null
    editingProvider: LLMProvider | null
    showDeleteDialog: LLMProvider | null
}

// Provider management actions
export interface ProviderManagementActions {
    loadProviders: () => Promise<void>
    createProvider: (data: CreateLegacyProviderRequest) => Promise<void>
    updateProvider: (id: string, data: UpdateLegacyProviderRequest) => Promise<void>
    deleteProvider: (id: string) => Promise<void>
    startCreate: () => void
    startEdit: (provider: LLMProvider) => void
    cancelForm: () => void
    confirmDelete: (provider: LLMProvider) => void
    cancelDelete: () => void
}

// Provider form validation
export interface ProviderFormValidation {
    name: string | null
    base_url: string | null
    api_key: string | null
}

export interface ProviderFormProps {
    provider?: LLMProvider
    onSubmit: (data: CreateLegacyProviderRequest | UpdateLegacyProviderRequest) => Promise<void>
    isLoading: boolean
}

export interface ProviderListItemProps {
    provider: LLMProvider
    onEdit: (provider: LLMProvider) => void
    onDelete: (provider: LLMProvider) => void
    isLoading: boolean
}
