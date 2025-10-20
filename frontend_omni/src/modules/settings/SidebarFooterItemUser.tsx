import { User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shadcn/components/ui/sidebar";

export function UserSidebarFooterItem() {
    const location = useLocation();
    const isActive = location.pathname.startsWith("/settings/user");

    const title = "User Settings";

    return (
        <SidebarMenuItem key="user-settings">
            <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
                <Link to={"/settings/user"}>
                    <User />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
