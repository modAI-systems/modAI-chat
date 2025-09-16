import { useState, useEffect } from 'react'
import type { LLMProvider, CreateProviderRequest, UpdateProviderRequest } from './providerService'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProviderFormProps {
    provider?: LLMProvider
    onSubmit: (data: CreateProviderRequest | UpdateProviderRequest) => void
    isLoading?: boolean
}

interface FormData {
    name: string
    base_url: string
    api_key: string
}

interface FormErrors {
    name?: string
    base_url?: string
    api_key?: string
}

export function ProviderForm({ provider, onSubmit, isLoading = false }: ProviderFormProps) {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        base_url: '',
        api_key: ''
    })

    const [errors, setErrors] = useState<FormErrors>({})

    useEffect(() => {
        if (provider) {
            setFormData({
                name: provider.name,
                base_url: provider.base_url,
                api_key: provider.api_key
            })
        }
    }, [provider])

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required'
        }

        // Base URL validation
        if (!formData.base_url.trim()) {
            newErrors.base_url = 'Base URL is required'
        } else {
            try {
                new URL(formData.base_url)
            } catch {
                newErrors.base_url = 'Please enter a valid URL'
            }
        }

        // API Key validation
        if (!formData.api_key.trim()) {
            newErrors.api_key = 'API Key is required'
        } else if (formData.api_key.length < 10) {
            newErrors.api_key = 'API Key seems too short'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (validateForm()) {
            onSubmit(formData)
        }
    }

    const handleInputChange = (field: keyof FormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const value = e.target.value
        setFormData(prev => ({ ...prev, [field]: value }))

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }))
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">
                    Provider Name *
                </Label>
                <Input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    disabled={isLoading}
                    placeholder="e.g., OpenAI Production"
                    aria-invalid={!!errors.name}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="base_url">
                    Base URL *
                </Label>
                <Input
                    type="url"
                    id="base_url"
                    value={formData.base_url}
                    onChange={handleInputChange('base_url')}
                    disabled={isLoading}
                    placeholder="https://api.openai.com/v1"
                    aria-invalid={!!errors.base_url}
                />
                {errors.base_url && (
                    <p className="text-sm text-destructive">{errors.base_url}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="api_key">
                    API Key *
                </Label>
                <Input
                    type="password"
                    id="api_key"
                    value={formData.api_key}
                    onChange={handleInputChange('api_key')}
                    disabled={isLoading}
                    placeholder="sk-..."
                    aria-invalid={!!errors.api_key}
                />
                {errors.api_key && (
                    <p className="text-sm text-destructive">{errors.api_key}</p>
                )}
            </div>
        </form>
    )
}
