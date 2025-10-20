import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
    type Model,
    type Provider,
    useLLMProviderService,
} from "@/modules/llm-provider-service";
import { LLMContext } from "./index";

interface LLMContextProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = "llm-selected-model";

export default function LLMContextProvider({
    children,
}: LLMContextProviderProps) {
    const service = useLLMProviderService();

    // Get the last session selected model from localStorage
    const [lastSessionSelectedModel] = useState<[Provider, Model] | null>(
        () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored ? JSON.parse(stored) : null;
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

    // Fetch models for the provider of the last session selected model
    const { data: models } = useSuspenseQuery({
        queryKey: ["llm-models", lastSessionSelectedModel?.[0]?.id],
        queryFn: async () => {
            if (!lastSessionSelectedModel) return [];
            const [provider] = lastSessionSelectedModel;
            try {
                return await service.getModels(provider.type, provider.id);
            } catch (error) {
                console.error(
                    "Failed to fetch models for provider:",
                    provider,
                    error,
                );
                return [];
            }
        },
    });

    // Initialize selectedModel based on whether the lastSessionSelectedModel still exists
    const [selectedModel, setSelectedModelState] = useState<
        [Provider, Model] | null
    >(() => {
        if (!lastSessionSelectedModel) return null;
        const [, model] = lastSessionSelectedModel;
        const modelExists = models.some((m) => m.id === model.id);
        return modelExists ? lastSessionSelectedModel : null;
    });

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
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    return (
        <LLMContext value={{ selectedModel, setSelectedModel }}>
            {children}
        </LLMContext>
    );
}
