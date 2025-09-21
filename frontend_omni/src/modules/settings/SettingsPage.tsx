import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shadcn/components/ui/resizable'
import { useModules } from "@/contexts/ModuleManagerContext";
import { Outlet } from "react-router-dom";
import type { ReactNode } from "react";

interface SettingsPageProps {
    children: ReactNode;
}

export function GlobalSettingsPage() {
    const modules = useModules()
    const globalSettingsNavItems = modules.getComponentsByName("GlobalSettingsNavItem")

    return (
        <SettingsPage>
            {globalSettingsNavItems.map((NavItem, index) => (
                <NavItem key={index} />
            ))}
        </SettingsPage>
    );
}

export function UserSettingsPage() {
    const modules = useModules()
    const userSettingsNavItems = modules.getComponentsByName("UserSettingsNavItem")

    return (
        <SettingsPage>
            {userSettingsNavItems.map((NavItem, index) => (
                <NavItem key={index} />
            ))}
        </SettingsPage>
    );
}

function SettingsPage({ children }: SettingsPageProps) {
    return (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
                <div className="h-full bg-card border-r p-4">
                    <div className="flex items-center justify-between mb-4">
                        {children}
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
