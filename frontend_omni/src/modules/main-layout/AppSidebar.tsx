import {
    MAIN_SIDEBAR_FOOTER_ITEM_MODULE_CLASS_NAME,
    MAIN_SIDEBAR_ITEM_MODULE_CLASS_NAME,
} from "@/moduleif/main-layout";
import { useModules } from "@/moduleif/moduleSystemService";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
} from "@/shadcn/components/ui/sidebar";

export function AppSidebar() {
    const modules = useModules();
    const sidebarItems = modules
        .getAll<{ position: number; component: React.ComponentType }>(
            MAIN_SIDEBAR_ITEM_MODULE_CLASS_NAME
        )
        .sort((a, b) => a.position - b.position)
        .map((item) => item.component);

    const sidebarFooterItems = modules
        .getAll<{ position: number; component: React.ComponentType }>(
            MAIN_SIDEBAR_FOOTER_ITEM_MODULE_CLASS_NAME
        )
        .sort((a, b) => a.position - b.position)
        .map((item) => item.component);

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
    );
}
