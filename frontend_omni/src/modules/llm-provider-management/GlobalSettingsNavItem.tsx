import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";

export function GlobalSettingsNavItem() {
    const location = useLocation()

    return <SidebarMenuButton asChild isActive={location.pathname === "/settings/global/llmproviders"}>
        <Link to="/settings/global/llmproviders">
            <span>LLM Providers</span>
        </Link>
    </SidebarMenuButton>
}
