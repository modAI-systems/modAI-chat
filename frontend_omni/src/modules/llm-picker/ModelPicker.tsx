import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Settings } from 'lucide-react'
import type { ModelSelectorProps, SelectedModel } from '@/moduleif/llmPicker'
import type { ProviderTypeGroup } from '@/moduleif/llmProviderService'

// Display logic functions
const useDisplayText = (
    getCurrentProviderType: () => ProviderTypeGroup | undefined,
    getCurrentProvider: () => any,
    getCurrentModel: () => any
) => {
    const getDisplayText = () => {
        const providerType = getCurrentProviderType()
        const provider = getCurrentProvider()
        const model = getCurrentModel()

        if (!providerType || !provider || !model) {
            return 'Select provider and model'
        }

        return `${provider.name} / ${model.name}`
    }

    return { getDisplayText }
}

// Data retrieval functions
const useCurrentModelData = (initialModel: SelectedModel, providerTypes: ProviderTypeGroup[]) => {
    const getCurrentProviderType = () => {
        return providerTypes.find(pt => pt.type.value === initialModel.providerType)
    }

    const getCurrentProvider = () => {
        const typeData = getCurrentProviderType()
        return typeData?.providers.find(p => p.id === initialModel.providerId)
    }

    const getCurrentModel = () => {
        const provider = getCurrentProvider()
        return provider?.models?.find(m => m.id === initialModel.modelId)
    }

    return {
        getCurrentProviderType,
        getCurrentProvider,
        getCurrentModel
    }
}

// Event handler functions
const useModelSelectionHandlers = (
    initialModel: SelectedModel,
    setSelectedModel: (config: SelectedModel) => void,
    providerTypes: ProviderTypeGroup[],
    setIsOpen: (open: boolean) => void
) => {
    const handleProviderTypeChange = (providerType: string) => {
        const typeData = providerTypes.find(pt => pt.type.value === providerType)
        if (typeData && typeData.providers.length > 0) {
            const firstProvider = typeData.providers[0]
            const firstModel = firstProvider.models?.[0]
            setSelectedModel({
                providerType,
                providerId: firstProvider.id,
                modelId: firstModel?.id || ''
            })
        } else {
            // No providers available, set empty config
            setSelectedModel({
                providerType,
                providerId: '',
                modelId: ''
            })
        }
    }

    const handleProviderChange = (providerId: string) => {
        setSelectedModel({
            ...initialModel,
            providerId,
            modelId: ''
        })
    }

    const handleModelChange = (modelId: string) => {
        setSelectedModel({
            ...initialModel,
            modelId
        })
        setIsOpen(false)
    }

    return {
        handleProviderTypeChange,
        handleProviderChange,
        handleModelChange
    }
}

export function ModelPicker({ initialModel, setSelectedModel, providerTypes }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)

    const {
        handleProviderTypeChange,
        handleProviderChange,
        handleModelChange
    } = useModelSelectionHandlers(initialModel, setSelectedModel, providerTypes, setIsOpen)

    const {
        getCurrentProviderType,
        getCurrentProvider,
        getCurrentModel
    } = useCurrentModelData(initialModel, providerTypes)

    const { getDisplayText } = useDisplayText(getCurrentProviderType, getCurrentProvider, getCurrentModel)

    return (
        <div className="relative">
            <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 h-auto"
            >
                <Settings className="h-4 w-4" />
                <span className="text-sm">{getDisplayText()}</span>
                <span className={`transition-transform text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </Button>

            {isOpen && (
                <Card className="absolute top-full left-0 mt-1 w-80 z-50 shadow-lg">
                    <CardContent className="p-4">
                        <Tabs
                            value={initialModel.providerType}
                            onValueChange={handleProviderTypeChange}
                            className="w-full"
                        >
                            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${providerTypes.length}, minmax(0, 1fr))` }}>
                                {providerTypes.map(providerType => (
                                    <TabsTrigger key={providerType.type.value} value={providerType.type.value}>
                                        {providerType.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {providerTypes.map(providerType => (
                                <TabsContent key={providerType.type.value} value={providerType.type.value} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="provider">Provider</Label>
                                        <Select
                                            value={initialModel.providerId}
                                            onValueChange={handleProviderChange}
                                            disabled={!getCurrentProviderType()?.providers.length}
                                        >
                                            <SelectTrigger id="provider">
                                                <SelectValue placeholder="Select provider" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getCurrentProviderType()?.providers.map(provider => (
                                                    <SelectItem key={provider.id} value={provider.id}>
                                                        <div className="flex flex-col">
                                                            <span>{provider.name}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {provider.url}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="model">Model</Label>
                                        <Select
                                            value={initialModel.modelId}
                                            onValueChange={handleModelChange}
                                            disabled={!getCurrentProvider()?.models?.length}
                                        >
                                            <SelectTrigger id="model">
                                                <SelectValue placeholder="Select model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getCurrentProvider()?.models?.map(model => (
                                                    <SelectItem key={model.id} value={model.id}>
                                                        <div className="flex flex-col">
                                                            <span>{model.name}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                Context: {model.context_length.toLocaleString()} tokens
                                                                {model.supports_streaming && ' • Streaming'}
                                                                {model.supports_functions && ' • Functions'}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
