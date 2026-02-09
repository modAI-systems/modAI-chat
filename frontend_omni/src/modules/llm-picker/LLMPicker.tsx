import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type {
    OpenAIModel,
    ProviderService,
} from "@/modules/llm-provider-service";
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
    model: OpenAIModel;
}

export function LLMPicker() {
    const { t } = useTranslation("llm-picker");
    const { selectedModel, setSelectedModel } = useLLMPicker();
    const service = useLLMProviderService();

    // refetchOnMount just a workaround for now.
    // TODO: find a better way for the query handling to share it accross components
    // and consider updating/adding/deleting providers to affect the cache then.
    const { data: models } = useSuspenseQuery({
        queryKey: ["llm-models"],
        refetchOnMount: "always",
        queryFn: async () => fetchAllModels(service),
    });

    return (
        <div className="w-full">
            <div className="flex gap-4 items-start">
                {/* Picker component */}
                <div className="w-fit">
                    <Select
                        disabled={models.length === 0}
                        value={selectedModel ?? ""}
                        onValueChange={(value) => {
                            const option = models.find((m) => m.id === value);
                            setSelectedModel(option ? option.id : null);
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

/**
 * Fetches all models from the central /models endpoint.
 * Model IDs are in format: {provider_type}/{provider_name}/{model_id}
 */
async function fetchAllModels(
    service: ProviderService,
): Promise<ModelOption[]> {
    const models = await service.getAllModels();
    return models.map((model) => {
        // Parse the model ID to extract provider info for display
        // Format: {provider_type}/{provider_name}/{model_id}
        const parts = model.id.split("/");
        const modelId = parts.length >= 3 ? parts.slice(2).join("/") : model.id;
        const providerName = parts.length >= 2 ? parts[1] : "Unknown";

        return {
            id: model.id,
            name: `${providerName} - ${modelId}`,
            model,
        };
    });
}

export default LLMPicker;
