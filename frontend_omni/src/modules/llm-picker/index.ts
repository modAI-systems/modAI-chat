import { createContext, useContext } from "react";

/**
 * LLM Context Type
 *
 * The selectedModel is now just the model ID string in the format:
 * {provider_type}/{provider_name}/{model_id}
 * e.g., "openai/My Provider/gpt-4o"
 */
export interface LLMContextType {
    selectedModel: string | null;
    setSelectedModel: (modelId: string | null) => void;
}

// Create context for the LLM selection
export const LLMContext = createContext<LLMContextType | undefined>(undefined);

/**
 * Hook to access the LLM context from any component
 *
 * @returns LLMContextType instance
 * @throws Error if used outside of LLMContextProvider
 */
export function useLLMPicker(): LLMContextType {
    const context = useContext(LLMContext);
    if (context === undefined) {
        throw new Error(
            "useLLMContext must be used within a LLMContextProvider",
        );
    }
    return context;
}

export { LLMPicker } from "./LLMPicker";
