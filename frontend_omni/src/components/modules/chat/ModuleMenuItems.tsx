import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Metadata, path, title } from "./Metadata";
import { useSession } from "@/services/modules/session/ContextProvider";

export function SidebarItem() {
    const { session } = useSession();

    if (!session) {
        return null; // Don't render the item if the user is not authenticated
    }

    return <SidebarMenuItem key={Metadata.id}>
        <SidebarMenuButton asChild tooltip={title}>
            <Link to={`${path}`}>
                <Plus />
                <span>{title}</span>
            </Link>
        </SidebarMenuButton>
    </SidebarMenuItem >;
}
