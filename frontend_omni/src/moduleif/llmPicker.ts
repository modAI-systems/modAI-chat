/**
 * LLM Picker Module Interface
 *
 * This module provides interfaces and types for selecting LLM providers and models in the UI.
 * It focuses on model selection functionality only - provider management is handled by the
 * llm-provider-management module.
 */

// Re-export relevant types from the provider service
import type {
    ProviderTypeGroup,
    ProviderWithModels,
    Model,
    Provider,
    ProviderType
} from './llmProviderService'

export type {
    ProviderTypeGroup,
    ProviderWithModels,
    Model,
    Provider,
    ProviderType
}

// UI-specific data structures for model selection
export interface SelectedModel {
    providerType: string
    providerId: string
    modelId: string
}

// Model selector component props
export interface ModelSelectorProps {
    initialModel: SelectedModel
    setSelectedModel: (config: SelectedModel) => void
    providerTypes: ProviderTypeGroup[]
}
