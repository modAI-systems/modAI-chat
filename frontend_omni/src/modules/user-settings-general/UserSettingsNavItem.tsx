import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";

export function UserSettingsNavItem() {
    const location = useLocation()

    return <SidebarMenuButton asChild isActive={location.pathname === "/settings/user/general"}>
        <Link to="/settings/user/general">
            <span>General</span>
        </Link>
    </SidebarMenuButton>
}
