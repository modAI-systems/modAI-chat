import { AlertTriangle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
    CreateProviderRequest,
    Provider,
    UpdateProviderRequest,
} from "@/modules/llm-provider-service";
import { useLLMProviderService } from "@/modules/llm-provider-service";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/shadcn/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/shadcn/components/ui/alert-dialog";
import { Button } from "@/shadcn/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shadcn/components/ui/card";
import { Input } from "@/shadcn/components/ui/input";
import { Label } from "@/shadcn/components/ui/label";

type ProviderFormData = {
    name: string;
    base_url: string;
    api_key: string;
    properties: Record<string, unknown>;
};

const PROVIDER_TYPE = "openai";

export default function LLMProviderManagementPage() {
    const { t } = useTranslation("llm-provider-management");
    const providerService = useLLMProviderService();

    const [providers, setProviders] = useState<Provider[]>([]);
    const [editingProviderId, setEditingProviderId] = useState<string | null>(
        null,
    );
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [formData, setFormData] = useState<ProviderFormData>({
        name: "",
        base_url: "",
        api_key: "",
        properties: {},
    });
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const loadProviders = useCallback(async () => {
        try {
            setLoadError(null);
            const data = await providerService.getProviders(PROVIDER_TYPE);
            setProviders(data);
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to load providers";
            setLoadError(errorMessage);
            console.error("Failed to load providers:", error);
        }
    }, [providerService]);

    useEffect(() => {
        loadProviders();
    }, [loadProviders]);

    const handleEditProvider = (provider: Provider) => {
        setEditingProviderId(provider.id);
        setIsAddingNew(false);
        setSaveError(null);
        setFormData({
            name: provider.name,
            base_url: provider.url,
            api_key: provider.api_key,
            properties: provider.properties,
        });
    };

    const handleAddProvider = () => {
        setIsAddingNew(true);
        setEditingProviderId(null);
        setSaveError(null);
        setFormData({
            name: "",
            base_url: "",
            api_key: "",
            properties: {},
        });
    };

    const handleCancel = () => {
        setEditingProviderId(null);
        setIsAddingNew(false);
        setSaveError(null);
        setFormData({
            name: "",
            base_url: "",
            api_key: "",
            properties: {},
        });
    };

    const handleSave = async () => {
        if (!formData.name || !formData.api_key) return;

        setLoading(true);
        setSaveError(null);
        try {
            if (isAddingNew) {
                const createRequest: CreateProviderRequest = {
                    name: formData.name,
                    base_url: formData.base_url,
                    api_key: formData.api_key,
                    properties: formData.properties,
                };
                await providerService.createProvider(
                    PROVIDER_TYPE,
                    createRequest,
                );
                toast.success(
                    t("provider-created", {
                        defaultValue: "Provider created successfully",
                    }),
                );
            } else if (editingProviderId) {
                const updateRequest: UpdateProviderRequest = {
                    name: formData.name,
                    base_url: formData.base_url,
                    api_key: formData.api_key,
                    properties: formData.properties,
                };
                await providerService.updateProvider(
                    PROVIDER_TYPE,
                    editingProviderId,
                    updateRequest,
                );
                toast.success(
                    t("provider-updated", {
                        defaultValue: "Provider updated successfully",
                    }),
                );
            }
            await loadProviders();
            handleCancel();
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to save provider";
            setSaveError(errorMessage);
            toast.error(
                t("save-failed", { defaultValue: "Failed to save provider" }),
            );
            console.error("Failed to save provider:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProvider = async (provider: Provider) => {
        setLoading(true);
        try {
            await providerService.deleteProvider(PROVIDER_TYPE, provider.id);
            toast.success(
                t("provider-deleted", {
                    defaultValue: "Provider deleted successfully",
                }),
            );
            await loadProviders();
        } catch (error) {
            toast.error(
                t("delete-failed", {
                    defaultValue: "Failed to delete provider",
                }),
            );
            console.error("Failed to delete provider:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">
                {t("title", { defaultValue: "LLM Provider Management" })}
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle>OpenAI</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>
                                {t("error-loading-providers", {
                                    defaultValue: "Error Loading Providers",
                                })}
                            </AlertTitle>
                            <AlertDescription>
                                {loadError}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-2"
                                    onClick={loadProviders}
                                >
                                    {t("retry", { defaultValue: "Retry" })}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {saveError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>
                                {t("error-saving-provider", {
                                    defaultValue: "Error Saving Provider",
                                })}
                            </AlertTitle>
                            <AlertDescription>{saveError}</AlertDescription>
                        </Alert>
                    )}

                    {providers.length === 0 && !isAddingNew && !loadError ? (
                        <p className="text-muted-foreground mb-4">
                            {t("no-providers", {
                                defaultValue: "No providers configured yet.",
                            })}
                        </p>
                    ) : (
                        <div className="space-y-2 mb-4">
                            {providers.map((provider) => (
                                <ProviderItem
                                    key={provider.id}
                                    provider={provider}
                                    isEditing={
                                        editingProviderId === provider.id
                                    }
                                    formData={formData}
                                    onEdit={handleEditProvider}
                                    onDelete={handleDeleteProvider}
                                    onFormChange={setFormData}
                                    onSave={handleSave}
                                    onCancel={handleCancel}
                                    loading={loading}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}

                    {isAddingNew && (
                        <NewProviderForm
                            isAddingNew={isAddingNew}
                            formData={formData}
                            onFormChange={setFormData}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            loading={loading}
                            t={t}
                        />
                    )}

                    {!isAddingNew && (
                        <Button onClick={handleAddProvider}>
                            {t("add-provider", {
                                defaultValue: "Add Provider",
                            })}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ProviderItem({
    provider,
    isEditing,
    formData,
    onEdit,
    onDelete,
    onFormChange,
    onSave,
    onCancel,
    loading,
    t,
}: {
    provider: Provider;
    isEditing: boolean;
    formData: ProviderFormData;
    onEdit: (provider: Provider) => void;
    onDelete: (provider: Provider) => Promise<void>;
    onFormChange: (data: ProviderFormData) => void;
    onSave: () => void;
    onCancel: () => void;
    loading: boolean;
    t: (key: string, options?: { defaultValue: string }) => string;
}) {
    return (
        <Card key={provider.id}>
            <CardContent>
                {!isEditing ? (
                    <div className="flex items-center justify-between p-2 -m-4 rounded transition-colors duration-200 hover:bg-muted/50">
                        <button
                            type="button"
                            className="font-medium cursor-pointer flex-1 text-left"
                            onClick={() => onEdit(provider)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onEdit(provider);
                                }
                            }}
                        >
                            {provider.name}
                        </button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={loading}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {t("delete-provider-title", {
                                            defaultValue: "Delete Provider",
                                        })}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t("delete-provider-description", {
                                            defaultValue: `Are you sure you want to delete "${provider.name}"? This action cannot be undone.`,
                                        }).replace(
                                            "{{providerName}}",
                                            provider.name,
                                        )}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        {t("cancel", {
                                            defaultValue: "Cancel",
                                        })}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => onDelete(provider)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {t("delete", {
                                            defaultValue: "Delete",
                                        })}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ) : (
                    <div className="p-2 -m-4 space-y-4">
                        <div>
                            <Label
                                htmlFor={`name-${provider.id}`}
                                className="mb-1"
                            >
                                {t("provider-name", {
                                    defaultValue: "Provider Name",
                                })}
                            </Label>
                            <Input
                                id={`name-${provider.id}`}
                                value={formData.name}
                                onChange={(e) =>
                                    onFormChange({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                placeholder={t("enter-name", {
                                    defaultValue: "Enter provider name",
                                })}
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor={`base_url-${provider.id}`}
                                className="mb-1"
                            >
                                {t("base-url", {
                                    defaultValue: "Base URL",
                                })}
                            </Label>
                            <Input
                                id={`base_url-${provider.id}`}
                                value={formData.base_url}
                                onChange={(e) =>
                                    onFormChange({
                                        ...formData,
                                        base_url: e.target.value,
                                    })
                                }
                                placeholder={t("enter-url", {
                                    defaultValue: "Enter base URL",
                                })}
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor={`api_key-${provider.id}`}
                                className="mb-1"
                            >
                                {t("api-key", { defaultValue: "API Key" })}
                            </Label>
                            <Input
                                id={`api_key-${provider.id}`}
                                type="password"
                                value={formData.api_key}
                                onChange={(e) =>
                                    onFormChange({
                                        ...formData,
                                        api_key: e.target.value,
                                    })
                                }
                                placeholder={t("enter-api-key", {
                                    defaultValue: "Enter API key",
                                })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={onSave}
                                disabled={
                                    loading ||
                                    !formData.name ||
                                    !formData.api_key
                                }
                            >
                                {loading
                                    ? t("saving", {
                                          defaultValue: "Saving...",
                                      })
                                    : t("save", { defaultValue: "Save" })}
                            </Button>
                            <Button variant="outline" onClick={onCancel}>
                                {t("cancel", { defaultValue: "Cancel" })}
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="default"
                                        disabled={loading}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t("delete", {
                                            defaultValue: "Delete",
                                        })}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {t("delete-provider-title", {
                                                defaultValue: "Delete Provider",
                                            })}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t("delete-provider-description", {
                                                defaultValue: `Are you sure you want to delete "${provider.name}"? This action cannot be undone.`,
                                            }).replace(
                                                "{{providerName}}",
                                                provider.name,
                                            )}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            {t("cancel", {
                                                defaultValue: "Cancel",
                                            })}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => onDelete(provider)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {t("delete", {
                                                defaultValue: "Delete",
                                            })}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function NewProviderForm({
    isAddingNew,
    formData,
    onFormChange,
    onSave,
    onCancel,
    loading,
    t,
}: {
    isAddingNew: boolean;
    formData: ProviderFormData;
    onFormChange: (data: ProviderFormData) => void;
    onSave: () => void;
    onCancel: () => void;
    loading: boolean;
    t: (key: string, options?: { defaultValue: string }) => string;
}) {
    const nameId = useId();
    const apiKeyId = useId();

    if (!isAddingNew) return null;

    return (
        <Card className="mb-2 transition-all duration-300 ease-in-out">
            <CardContent className="pt-4">
                <div className="space-y-4 opacity-100 transform translate-y-0 transition-all duration-300 ease-in-out">
                    <div>
                        <Label htmlFor={nameId}>
                            {t("provider-name", {
                                defaultValue: "Provider Name",
                            })}
                        </Label>
                        <Input
                            id={nameId}
                            value={formData.name}
                            onChange={(e) =>
                                onFormChange({
                                    ...formData,
                                    name: e.target.value,
                                })
                            }
                            placeholder={t("enter-name", {
                                defaultValue: "Enter provider name",
                            })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="new-base_url">
                            {t("base-url", { defaultValue: "Base URL" })}
                        </Label>
                        <Input
                            value={formData.base_url}
                            onChange={(e) =>
                                onFormChange({
                                    ...formData,
                                    base_url: e.target.value,
                                })
                            }
                            placeholder={t("enter-url", {
                                defaultValue: "Enter base URL",
                            })}
                        />
                    </div>
                    <div>
                        <Label htmlFor={apiKeyId}>
                            {t("api-key", { defaultValue: "API Key" })}
                        </Label>
                        <Input
                            id={apiKeyId}
                            type="password"
                            value={formData.api_key}
                            onChange={(e) =>
                                onFormChange({
                                    ...formData,
                                    api_key: e.target.value,
                                })
                            }
                            placeholder={t("enter-api-key", {
                                defaultValue: "Enter API key",
                            })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={onSave}
                            disabled={
                                loading || !formData.name || !formData.api_key
                            }
                        >
                            {loading
                                ? t("creating", {
                                      defaultValue: "Creating...",
                                  })
                                : t("create-provider", {
                                      defaultValue: "Create Provider",
                                  })}
                        </Button>
                        <Button variant="outline" onClick={onCancel}>
                            {t("cancel", { defaultValue: "Cancel" })}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
