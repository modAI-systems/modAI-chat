import { SidebarMenuButton, SidebarMenuItem } from "@/shadcn/components/ui/sidebar";
import { User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/moduleif/sessionContext";
import { Metadata, userSettingsPath } from "./MetaUserSettings";

export function UserSidebarFooterItem() {
    const { session } = useSession();
    const location = useLocation();
    const isActive = location.pathname.startsWith(userSettingsPath);

    const title = "User Settings";

    if (!session) {
        return null; // Don't render the item if the user is not authenticated
    }

    return (
        <SidebarMenuItem key={Metadata.id}>
            <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
                <Link to={userSettingsPath}>
                    <User />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
