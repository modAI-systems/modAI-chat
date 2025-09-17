/**
 * LLM Provider Service Context Provider
 *
 * Provides the LLMProviderService instance to the entire application
 * via React Context.
 */

import React, { createContext, useContext } from 'react';
import type { ProviderService } from "@/moduleif/llmProviderService";
import { LLMProviderService } from './LLMProviderService';

// Create context for the LLM provider service
const LLMProviderServiceContext = createContext<ProviderService | undefined>(undefined);

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
