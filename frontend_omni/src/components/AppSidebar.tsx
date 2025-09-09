import { Settings } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "./ui/sidebar"
import { moduleManager } from "@/services/moduleManager"

const footerItems = [
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
]

export function AppSidebar() {
    const location = useLocation()
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
                    {footerItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={location.pathname === item.url}
                                tooltip={item.title}
                            >
                                <Link to={item.url}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
