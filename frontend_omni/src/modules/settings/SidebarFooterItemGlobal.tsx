import { SidebarMenuButton, SidebarMenuItem } from "@/shadcn/components/ui/sidebar";
import { Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Metadata, globalSettingsPath } from "./MetaGlobalSettings";
import { useSession } from "@/moduleif/sessionContext";

export function GlobalSidebarFooterItem() {
    const { session } = useSession();
    const location = useLocation();
    const isActive = location.pathname.startsWith(globalSettingsPath);

    const title = "Global Settings";

    if (!session) {
        return null; // Don't render the item if the user is not authenticated
    }

    return (
        <SidebarMenuItem key={Metadata.id}>
            <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
                <Link to={`${globalSettingsPath}`}>
                    <Settings />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
