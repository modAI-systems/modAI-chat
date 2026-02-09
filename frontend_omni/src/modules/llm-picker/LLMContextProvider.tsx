import { type ReactNode, useState } from "react";
import { LLMContext } from "./index";

interface LLMContextProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = "llm-selected-model";

export function LLMContextProvider({ children }: LLMContextProviderProps) {
    // Get the last session selected model ID from localStorage
    const [selectedModel, setSelectedModelState] = useState<string | null>(
        () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (!stored) return null;

                // Handle both old format [Provider, Model] and new format (string)
                const parsed = JSON.parse(stored);
                if (typeof parsed === "string") {
                    return parsed;
                }
                // Old format - try to migrate
                if (Array.isArray(parsed) && parsed.length === 2) {
                    // Old format was [provider, model], try to construct new ID
                    const [provider, model] = parsed;
                    if (provider?.type && provider?.name && model?.id) {
                        return `${provider.type}/${provider.name}/${model.id}`;
                    }
                }
                return null;
            } catch (error) {
                console.warn(
                    "Failed to load selected LLM model from localStorage:",
                    error,
                );
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
        },
    );

    const setSelectedModel = (modelId: string | null) => {
        setSelectedModelState(modelId);
        try {
            if (modelId) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(modelId));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.warn(
                "Failed to save selected LLM model to localStorage:",
                error,
            );
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    return (
        <LLMContext value={{ selectedModel, setSelectedModel }}>
            {children}
        </LLMContext>
    );
}
