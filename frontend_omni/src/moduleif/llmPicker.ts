/**
 * LLM Provider Management Module Interface
 *
 * This module provides interfaces and types for managing LLM providers and models in the UI.
 * It focuses on UI-specific types and re-exports service types for convenience.
 */

// UI-specific data structures
export interface SelectedModel {
    providerType: string
    providerId: string
    modelId: string
}
