/**
 * LLM Provider Service Context Provider
 *
 * Provides the LLMProviderService instance to the entire application
 * via React Context.
 */

import React from 'react';
import { LLMProviderServiceContext } from "@/moduleif/llmProviderService";
import { LLMProviderService } from './LLMProviderService';

/**
 * Context provider that makes the LLM provider service available
 * throughout the application component tree
 */
export function ContextProvider({ children }: { children: React.ReactNode }) {
    const llmProviderServiceInstance = new LLMProviderService();

    return (
        <LLMProviderServiceContext value={llmProviderServiceInstance}>
            {children}
        </LLMProviderServiceContext>
    );
}
