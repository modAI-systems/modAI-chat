import { Separator } from '@/components/ui/separator'

interface ProviderSectionProps {
    title: string
    children: React.ReactNode
}

export function ProviderSection({ title, children }: ProviderSectionProps) {
    return (
        <div className="mb-8">
            {/* Horizontal line with provider type label */}
            <div className="relative mb-6">
                <Separator />
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <span className="bg-background px-3 py-1 text-sm font-medium text-foreground border rounded-md">
                        {title}
                    </span>
                </div>
            </div>

            {/* Provider content */}
            <div className="space-y-4">
                {children}
            </div>
        </div>
    )
}
