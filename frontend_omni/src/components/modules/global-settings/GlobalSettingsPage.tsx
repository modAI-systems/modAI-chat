import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useModules } from "@/contexts/ModuleManagerContext";
import { Outlet } from "react-router-dom";

export default function GlobalSettingsPage() {
    const modules = useModules()
    const globalSettingsNavItems = modules.getComponentsByName("GlobalSettingsNavItem")

    return (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
                <div className="h-full bg-card border-r border-border p-4">
                    <div className="flex items-center justify-between mb-4">
                        {globalSettingsNavItems.map((NavItem, index) => (
                            <NavItem key={index} />
                        ))}
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
                <div className="flex flex-col h-full max-h-screen">
                    <Outlet />
                </div>
            </ResizablePanel>
        </ResizablePanelGroup >
    );
}
