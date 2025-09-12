import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Metadata, path, title } from "./Metadata";

export function SidebarItem() {
    return <SidebarMenuItem key={Metadata.id}>
        <SidebarMenuButton asChild tooltip={title}>
            <Link to={`${path}`}>
                <Plus />
                <span>{title}</span>
            </Link>
        </SidebarMenuButton>
    </SidebarMenuItem >;
}
