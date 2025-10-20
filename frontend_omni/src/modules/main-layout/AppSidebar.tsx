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
    const sidebarItems = modules.getAll<React.ComponentType>("SidebarItem");

    const sidebarFooterItems =
        modules.getAll<React.ComponentType>("SidebarFooterItem");

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-row items-center justify-end">
                <SidebarRail />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {sidebarItems.map((Component, index) => (
                        <Component
                            key={`${Component.name || "Component"}-${index}`}
                        />
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {sidebarFooterItems.map((Component, index) => (
                        <Component
                            key={`${Component.name || "FooterComponent"}-${index}`}
                        />
                    ))}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
