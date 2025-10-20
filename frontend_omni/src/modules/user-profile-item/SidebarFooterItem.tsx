import { useSession } from "@/modules/session-provider";
import { SidebarMenuItem } from "@/shadcn/components/ui/sidebar";
import { UserDisplay } from "./UserDisplay";

export function SidebarFooterItem() {
    const { session } = useSession();

    if (!session) {
        return null;
    }

    const user = session.user;

    return (
        <SidebarMenuItem>
            <UserDisplay
                username={user.full_name || user.email}
                userEmail={user.email}
            />
        </SidebarMenuItem>
    );
}
