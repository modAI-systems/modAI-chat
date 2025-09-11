import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
} from "./ui/sidebar"
import { useWebModules } from "@/contexts/WebModulesContext"

export function AppSidebar() {
    const { sidebarModules } = useWebModules()

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-row items-center justify-end">
                <SidebarRail />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {sidebarModules.map((module) => {
                        const item = module.createSidebarItem();
                        return item;
                    }).filter(Boolean)}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {sidebarModules.map((module) => {
                        const item = module.createSidebarFooterItem();
                        return item;
                    }).filter(Boolean)}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
