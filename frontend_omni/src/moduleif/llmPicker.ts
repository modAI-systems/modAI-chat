/**
 * LLM Picker Module Interface
 *
 * This module provides interfaces and types for selecting LLM providers and models in the UI.
 * It focuses on model selection functionality only - provider management is handled by the
 * llm-provider-management module.
 *
 * What this module offers to users: Model selection component for choosing LLM providers and models with
 *   the name "ModelPicker".
 *
 * Implementation Notes: The implementation must create the picker with the following interface
 *
 *    export function ModelPicker({ initialModel, setSelectedModel, providerTypes }: ModelSelectorProps) {
 *
 */

import type { ProviderTypeGroup } from "./llmProviderService"

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
