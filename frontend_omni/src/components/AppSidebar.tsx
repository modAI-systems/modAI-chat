import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
} from "./ui/sidebar"
import { moduleManager } from "@/services/moduleManager"

export function AppSidebar() {
    const modules = moduleManager.getModules()

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-row items-center justify-end">
                <SidebarRail />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {modules.map((module) => (
                        module.createSidebarItem()
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {modules.map((module) => (
                        module.createSidebarFooterItem?.()
                    ))}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
