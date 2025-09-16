import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { providerService, type Provider, type Model, type ProviderType } from './providerService'
import { Settings } from 'lucide-react'
import type { SelectedModel } from './ModuleContract'

interface ModelSelectorProps {
    config: SelectedModel
    onConfigChange: (config: SelectedModel) => void
}

interface ProviderWithModels extends Provider {
    models?: Model[]
}

interface ProviderTypeData {
    type: ProviderType
    label: string
    providers: ProviderWithModels[]
}

export function ModelSelector({ config, onConfigChange }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [providerTypes, setProviderTypes] = useState<ProviderTypeData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadProviders()
    }, [])

    const loadProviders = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await providerService.getAllProvidersWithModels()
            setProviderTypes(data)
        } catch (err) {
            console.error('Failed to load providers:', err)
            setError('Failed to load providers. Using fallback configuration.')
        } finally {
            setLoading(false)
        }
    }

    const handleProviderTypeChange = (providerType: string) => {
        const typeData = providerTypes.find(pt => pt.type.value === providerType)
        if (typeData && typeData.providers.length > 0) {
            const firstProvider = typeData.providers[0]
            const firstModel = firstProvider.models?.[0]
            onConfigChange({
                providerType,
                providerId: firstProvider.id,
                modelId: firstModel?.id || ''
            })
        } else {
            // No providers available, set empty config
            onConfigChange({
                providerType,
                providerId: '',
                modelId: ''
            })
        }
    }

    const handleProviderChange = (providerId: string) => {
        onConfigChange({
            ...config,
            providerId,
            modelId: ''
        })
    }

    const handleModelChange = (modelId: string) => {
        onConfigChange({
            ...config,
            modelId
        })
        setIsOpen(false)
    }

    const getCurrentProviderType = () => {
        return providerTypes.find(pt => pt.type.value === config.providerType)
    }

    const getCurrentProvider = () => {
        const typeData = getCurrentProviderType()
        return typeData?.providers.find(p => p.id === config.providerId)
    }

    const getCurrentModel = () => {
        const provider = getCurrentProvider()
        return provider?.models?.find(m => m.id === config.modelId)
    }

    const getDisplayText = () => {
        if (loading) return 'Loading...'
        if (error) return 'Error loading providers'

        const providerType = getCurrentProviderType()
        const provider = getCurrentProvider()
        const model = getCurrentModel()

        if (!providerType || !provider || !model) {
            return 'Select provider and model'
        }

        return `${provider.name} / ${model.name}`
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2">
                <Settings className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
            </div>
        )
    }

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
                        {error && (
                            <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded mb-4">
                                {error}
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={loadProviders}
                                    className="h-auto p-0 ml-2"
                                >
                                    Retry
                                </Button>
                            </div>
                        )}

                        <Tabs
                            value={config.providerType}
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
                                            value={config.providerId}
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
                                            value={config.modelId}
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

                                    <div className="flex justify-between gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={loadProviders}
                                            disabled={loading}
                                        >
                                            Refresh
                                        </Button>
                                        <Button
                                            onClick={() => setIsOpen(false)}
                                            size="sm"
                                        >
                                            Apply Settings
                                        </Button>
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
