import { useState, useEffect, type ReactNode } from "react";
import type { Provider, Model } from "@/modules/llm-provider-service";
import { LLMContext } from "./index";

interface LLMContextProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = "llm-selected-model";

export default function LLMContextProvider({
    children,
}: LLMContextProviderProps) {
    const [selectedModel, setSelectedModelState] = useState<
        [Provider, Model] | null
    >(null);

    // Load selected model from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as [Provider, Model];
                setSelectedModelState(parsed);
            }
        } catch (error) {
            console.warn(
                "Failed to load selected LLM model from localStorage:",
                error,
            );
        }
    }, []);

    const setSelectedModel = (model: [Provider, Model] | null) => {
        setSelectedModelState(model);
        try {
            if (model) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.warn(
                "Failed to save selected LLM model to localStorage:",
                error,
            );
        }
    };

    return (
        <LLMContext value={{ selectedModel, setSelectedModel }}>
            {children}
        </LLMContext>
    );
}
