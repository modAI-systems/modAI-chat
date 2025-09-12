import { SidebarMenuItem } from "@/components/ui/sidebar";
import { UserDisplay } from "./UserDisplay";
import { useSession } from "@/services/module/session/SessionProvider";

export function UserDisplaySidebarItem() {
    const { session, isLoading } = useSession();

    if (isLoading) {
        return (
            <SidebarMenuItem>
                <UserDisplay username="Loading..." userEmail="" />
            </SidebarMenuItem>
        );
    }

    if (!session) {
        return (
            <SidebarMenuItem>
                <UserDisplay username="Not authenticated" userEmail="" />
            </SidebarMenuItem>
        );
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
