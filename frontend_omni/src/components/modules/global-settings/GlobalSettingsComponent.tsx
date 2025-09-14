import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

export default function GlobalSettingsComponent() {
    return (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={20}>
                <div className="h-full bg-card border-r border-border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Details</h3>
                    </div>
                    <div className="h-full">
                        <p className="text-muted-foreground">Detail panel content will be added here.</p>
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
                <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Global Settings
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Settings panel content will be added here.
                        </p>
                    </div>
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}
