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
    const modules = moduleManager.getSidebarModules()

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-row items-center justify-end">
                <SidebarRail />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {modules.map((module) => {
                        const item = module.createSidebarItem();
                        return item;
                    }).filter(Boolean)}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {modules.map((module) => {
                        const item = module.createSidebarFooterItem();
                        return item;
                    }).filter(Boolean)}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
