import {
    MAIN_SIDEBAR_FOOTER_ITEM_MODULE_CLASS_NAME,
    MAIN_SIDEBAR_ITEM_MODULE_CLASS_NAME,
} from "@/modules/main-layout";
import { useModules } from "@/modules/module-system";
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
    const sidebarItems = modules.getAll<React.ComponentType>(
        MAIN_SIDEBAR_ITEM_MODULE_CLASS_NAME
    );

    const sidebarFooterItems = modules.getAll<React.ComponentType>(
        MAIN_SIDEBAR_FOOTER_ITEM_MODULE_CLASS_NAME
    );

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
