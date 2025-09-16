/**
 * @deprecated This service has been moved to the modules/llm-provider-service module.
 * Please update your imports to use the module-based approach.
 *
 * This file provides backward compatibility and will be removed in a future version.
 */

export {
    llmProviderService,
    getProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    PROVIDER_TYPES
} from '../modules/llm-provider-service/LLMProviderService'
