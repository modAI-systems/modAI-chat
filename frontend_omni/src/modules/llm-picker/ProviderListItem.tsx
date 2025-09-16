import type { LLMProvider } from '@/moduleif/llmProviderService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ProviderListItemProps {
    provider: LLMProvider
    onEdit: (provider: LLMProvider) => void
    onDelete: (provider: LLMProvider) => void
    isLoading?: boolean
}

export function ProviderListItem({ provider, onEdit, onDelete, isLoading = false }: ProviderListItemProps) {
    const handleEdit = () => {
        if (!isLoading) {
            onEdit(provider)
        }
    }

    const handleDelete = () => {
        if (!isLoading) {
            onDelete(provider)
        }
    }

    const truncateApiKey = (apiKey: string | null) => {
        if (!apiKey) return 'No API Key'
        if (apiKey.length <= 10) return apiKey
        return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{provider.name}</CardTitle>
                <CardDescription>{provider.base_url}</CardDescription>
                <CardAction>
                    <div className="flex space-x-2">
                        <Button
                            onClick={handleEdit}
                            disabled={isLoading}
                            variant="outline"
                            size="sm"
                        >
                            Edit
                        </Button>
                        <Button
                            onClick={handleDelete}
                            disabled={isLoading}
                            variant="destructive"
                            size="sm"
                        >
                            Delete
                        </Button>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-medium text-muted-foreground">Base URL:</span>
                        <p className="text-foreground break-all mt-1">{provider.base_url}</p>
                    </div>

                    <div>
                        <span className="font-medium text-muted-foreground">API Key:</span>
                        <p className="text-foreground font-mono mt-1">{truncateApiKey(provider.api_key)}</p>
                    </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>Created: {new Date(provider.created_at).toLocaleDateString()}</span>
                    <span>Updated: {new Date(provider.updated_at).toLocaleDateString()}</span>
                </div>
            </CardContent>
        </Card>
    )
}
