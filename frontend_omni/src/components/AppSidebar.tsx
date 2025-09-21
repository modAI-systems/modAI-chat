import { useModules } from "@/contexts/ModuleManagerContext"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
} from "@/shadcn/components/ui/sidebar"

export function AppSidebar() {
    const modules = useModules()
    const sidebarItems = modules.getComponentsByName("SidebarItem")
    const sidebarFooterItems = modules.getComponentsByName("SidebarFooterItem")

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-row items-center justify-end">
                <SidebarRail />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {sidebarItems.map((Component, index) => (
                        <Component key={index} />
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {sidebarFooterItems.map((Component, index) => (
                        <Component key={index} />
                    ))}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
