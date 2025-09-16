/**
 * Service for fetching LLM providers and models from the backend API
 *
 * @deprecated This file is deprecated. Use ../llm-provider-service/LLMProviderService instead.
 * This file is kept for backward compatibility only.
 */

export {
    llmProviderService as providerService,
    getProviders,
    createProvider,
    updateProvider,
    deleteProvider
} from '../llm-provider-service/LLMProviderService'
