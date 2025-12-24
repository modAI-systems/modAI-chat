import { Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shadcn/components/ui/sidebar";

export function SidebarFooterItemGlobal() {
    const location = useLocation();
    const isActive = location.pathname.startsWith("/settings/global");

    const title = "Global Settings";

    return (
        <SidebarMenuItem key="global-settings">
            <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
                <Link to={"/settings/global"}>
                    <Settings />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
