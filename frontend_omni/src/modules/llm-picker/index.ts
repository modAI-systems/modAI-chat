import { createContext, useContext } from "react";
import type { Provider, Model } from "@/modules/llm-provider-service";

export interface LLMContextType {
    selectedModel: [Provider, Model] | null;
    setSelectedModel: (model: [Provider, Model] | null) => void;
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
