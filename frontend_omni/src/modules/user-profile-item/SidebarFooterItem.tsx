import { SidebarMenuItem } from "@/components/ui/sidebar";
import { UserDisplay } from "./UserDisplay";
import { useSession } from "@/modules/session/ContextProvider";

export function SidebarFooterItem() {
    const { session, isLoading } = useSession();

    if (isLoading) {
        return (
            <SidebarMenuItem>
                <UserDisplay username="Loading..." userEmail="" />
            </SidebarMenuItem>
        );
    }

    if (!session) {
        return null
    }

    const user = session.getUser();

    return (
        <SidebarMenuItem>
            <UserDisplay
                username={user.full_name || user.email}
                userEmail={user.email}
            />
        </SidebarMenuItem>
    );
}
