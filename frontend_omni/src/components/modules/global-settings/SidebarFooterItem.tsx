import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Metadata, path, title } from "./Metadata";
import { useSession } from "@/services/modules/session/ContextProvider";

export function SidebarFooterItem() {
    const { session } = useSession();
    const location = useLocation();
    const isActive = location.pathname.startsWith(path);

    if (!session) {
        return null; // Don't render the item if the user is not authenticated
    }

    return (
        <SidebarMenuItem key={Metadata.id}>
            <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
                <Link to={`${path}`}>
                    <Settings />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
