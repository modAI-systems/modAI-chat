import { useState, useEffect } from 'react'
import { ProviderSection } from './ProviderSection'
import { ProviderListItem } from './ProviderListItem'
import { ProviderForm } from './ProviderForm'
import { type LLMProvider, type CreateLegacyProviderRequest, type UpdateLegacyProviderRequest, useLLMProviderService } from '@/moduleif/llmProviderService'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Extracted Components
function PageHeader() {
    return (
        <div className="bg-card border-b px-6 py-4">
            <h1 className="text-2xl font-semibold">LLM Provider Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
                Configure and manage your AI model providers
            </p>
        </div>
    )
}

interface ErrorDisplayProps {
    error: string
}

function ErrorDisplay({ error }: ErrorDisplayProps) {
    return (
        <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex">
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-destructive">Error</h3>
                    <div className="mt-2 text-sm text-destructive/80">
                        {error}
                    </div>
                </div>
            </div>
        </div>
    )
}

function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="text-center py-8 text-muted-foreground">
            <p>No providers configured yet.</p>
            <p className="text-sm mt-1">Create your first provider to get started.</p>
        </div>
    )
}

interface ActionBarProps {
    isFormActive: boolean
    loading: boolean
    saving: boolean
    onCreateProvider: () => void
    onCancelForm: () => void
    onSaveForm: () => void
}

function ActionBar({
    isFormActive,
    loading,
    saving,
    onCreateProvider,
    onCancelForm,
    onSaveForm
}: ActionBarProps) {
    return (
        <div className="bg-background border-t px-6 py-3 flex justify-between items-center">
            <div className="flex space-x-2">
                {!isFormActive && (
                    <Button
                        onClick={onCreateProvider}
                        disabled={loading || saving}
                    >
                        Add New Provider
                    </Button>
                )}
            </div>

            <div className="flex space-x-2">
                {isFormActive && (
                    <>
                        <Button
                            onClick={onCancelForm}
                            disabled={saving}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onSaveForm}
                            disabled={saving}
                            className="flex items-center"
                        >
                            {saving && (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"></path>
                                </svg>
                            )}
                            {saving ? 'Saving...' : 'Save Provider'}
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}

type FormMode = 'create' | 'edit' | null

interface EditingProvider {
    provider: LLMProvider
    index: number
}

interface DeleteConfirmDialogProps {
    provider: LLMProvider | null
    saving: boolean
    onConfirmDelete: () => Promise<void>
    onCancel: () => void
}

function DeleteConfirmDialog({ provider, saving, onConfirmDelete, onCancel }: DeleteConfirmDialogProps) {
    return (
        <AlertDialog open={!!provider} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Provider</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete "{provider?.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={saving}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirmDelete}
                        disabled={saving}
                        className="flex items-center bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {saving && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"></path>
                            </svg>
                        )}
                        {saving ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function LLMProviderManagementPage() {
    const llmProviderService = useLLMProviderService()
    const [providers, setProviders] = useState<LLMProvider[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formMode, setFormMode] = useState<FormMode>(null)
    const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState<LLMProvider | null>(null)

    useEffect(() => {
        loadProviders()
    }, [])

    const loadProviders = async () => {
        try {
            setLoading(true)
            setError(null)
            const providersData = await llmProviderService.getLegacyProviders()
            setProviders(providersData)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load providers')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateProvider = () => {
        setFormMode('create')
        setEditingProvider(null)
    }

    const handleEditProvider = (provider: LLMProvider) => {
        const index = providers.findIndex(p => p.id === provider.id)
        setFormMode('edit')
        setEditingProvider({ provider, index })
    }

    const handleDeleteProvider = (provider: LLMProvider) => {
        setShowDeleteDialog(provider)
    }

    const confirmDeleteProvider = async () => {
        if (!showDeleteDialog) return

        try {
            setSaving(true)
            setError(null)

            await llmProviderService.deleteLegacyProvider(showDeleteDialog.id)

            // Remove from local state
            setProviders(prev => prev.filter(p => p.id !== showDeleteDialog.id))
            setShowDeleteDialog(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete provider')
        } finally {
            setSaving(false)
        }
    }

    const handleFormSubmit = async (data: CreateLegacyProviderRequest | UpdateLegacyProviderRequest) => {
        try {
            setSaving(true)
            setError(null)

            if (formMode === 'create') {
                const newProviderData = await llmProviderService.createLegacyProvider(data)
                setProviders(prev => [...prev, newProviderData])
            } else if (formMode === 'edit' && editingProvider) {
                const updatedProvider = await llmProviderService.updateLegacyProvider(
                    editingProvider.provider.id,
                    data
                )
                setProviders(prev =>
                    prev.map(p => p.id === editingProvider.provider.id ? updatedProvider : p)
                )
            }

            // Reset form
            setFormMode(null)
            setEditingProvider(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save provider')
        } finally {
            setSaving(false)
        }
    }

    const handleCancelForm = () => {
        setFormMode(null)
        setEditingProvider(null)
    }

    const isFormActive = formMode !== null

    return (
        <div className="h-full flex flex-col bg-background">
            <PageHeader />

            {error && <ErrorDisplay error={error} />}

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-auto px-6 py-4">
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <ProviderSection title="OpenAI Providers">
                        {providers.length === 0 ? (
                            <EmptyState />
                        ) : (
                            providers.map((provider) => (
                                <ProviderListItem
                                    key={provider.id}
                                    provider={provider}
                                    onEdit={handleEditProvider}
                                    onDelete={handleDeleteProvider}
                                    isLoading={saving}
                                />
                            ))
                        )}

                        {/* Provider Form */}
                        {isFormActive && (
                            <div className="mt-6 p-6 bg-card border rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium mb-4">
                                    {formMode === 'create' ? 'Create New Provider' : 'Edit Provider'}
                                </h3>
                                <ProviderForm
                                    provider={editingProvider?.provider}
                                    onSubmit={handleFormSubmit}
                                    isLoading={saving}
                                />
                            </div>
                        )}
                    </ProviderSection>
                )}
            </div>

            <ActionBar
                isFormActive={isFormActive}
                loading={loading}
                saving={saving}
                onCreateProvider={handleCreateProvider}
                onCancelForm={handleCancelForm}
                onSaveForm={() => {
                    const form = document.querySelector('form')
                    if (form) {
                        const submitEvent = new Event('submit', { cancelable: true, bubbles: true })
                        form.dispatchEvent(submitEvent)
                    }
                }}
            />

            <DeleteConfirmDialog
                provider={showDeleteDialog}
                saving={saving}
                onConfirmDelete={confirmDeleteProvider}
                onCancel={() => setShowDeleteDialog(null)}
            />
        </div>
    )
}
