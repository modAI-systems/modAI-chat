import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Model, Provider } from "@/modules/llm-provider-service";
import { useLLMProviderService } from "@/modules/llm-provider-service";
import { Alert, AlertDescription } from "@/shadcn/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shadcn/components/ui/select";
import { useLLMPicker } from "./index";

interface ModelOption {
    id: string;
    name: string;
    provider: Provider;
    model: Model;
}

// Provider type mapping - maps to backend provider types
const PROVIDER_TYPES = ["openai"];

export function LLMPicker() {
    const { t } = useTranslation("llm-picker");
    const { selectedModel, setSelectedModel } = useLLMPicker();
    const service = useLLMProviderService();

    const { data: models } = useSuspenseQuery({
        queryKey: ["llm-models"],
        queryFn: async () => {
            const allModels: ModelOption[] = [];
            for (const type of PROVIDER_TYPES) {
                const providers = await service.getProviders(type);
                for (const provider of providers) {
                    const providerModels = await service.getModels(
                        type,
                        provider.id,
                    );
                    allModels.push(
                        ...providerModels.map((model) => ({
                            id: `${provider.id}/${model.id}`,
                            name: `${provider.name} - ${model.name}`,
                            provider,
                            model,
                        })),
                    );
                }
            }
            return allModels;
        },
    });

    return (
        <div className="w-full">
            <div className="flex gap-4 items-start">
                {/* Picker component */}
                <div className="w-fit">
                    <Select
                        disabled={models.length === 0}
                        value={
                            selectedModel
                                ? `${selectedModel[0].id}/${selectedModel[1].id}`
                                : ""
                        }
                        onValueChange={(value) => {
                            const option = models.find((m) => m.id === value);
                            setSelectedModel(
                                option ? [option.provider, option.model] : null,
                            );
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue
                                placeholder={t("selectModel", {
                                    defaultValue: "Select LLM Model",
                                })}
                            />
                        </SelectTrigger>
                        {models.length > 0 && (
                            <SelectContent>
                                {models.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        )}
                    </Select>
                </div>
                {/* Warning component - only show when no models */}
                {models.length === 0 && (
                    <Alert variant="destructive" className="w-fit">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="whitespace-nowrap">
                            <div>
                                <Trans i18nKey="noModelsHint" ns="llm-picker">
                                    No models available.{" "}
                                    <Link
                                        to="/settings/global/llm-providers"
                                        className="underline hover:no-underline"
                                    >
                                        Click here
                                    </Link>{" "}
                                    to configure a provider.
                                </Trans>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}

export default LLMPicker;
