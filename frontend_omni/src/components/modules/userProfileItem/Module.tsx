import type { SidebarModule, WebModule } from "@/types/module";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import React, { Suspense, use } from "react";
import { UserDisplay } from "./UserDisplay";
import { getCurrentUser, type User } from "@/services/userService";

// Create the promise OUTSIDE the component to prevent recreation on each render
// This is the recommended pattern according to React docs
const userPromise = getCurrentUser().catch((error) => {
    console.error('Failed to fetch user:', error);
    // Return fallback data instead of throwing
    return {
        id: 'unknown',
        full_name: 'Unknown'
    } as User;
});

class Module implements SidebarModule {
    id = 'userprofileitem';
    version = '1.0.0';
    description = 'User profile display and logout functionality in sidebar footer';
    author = 'ModAI Team';

    private handleLogout = () => {
        // TODO: Implement actual logout logic
        console.log("Logging out...")
        // You can add your logout logic here
    }

    createSidebarItem(): React.ReactElement {
        return <></>; // Not needed
    }

    createSidebarFooterItem(): React.ReactElement {
        const user = use(userPromise);

        return (
            <React.Fragment key={this.id}>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={this.handleLogout} tooltip="Log out">
                        <LogOut />
                        <span>Log out</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Suspense fallback={<UserDisplay username="Loading..." userEmail="" />}>
                        <UserDisplay
                            username={user.full_name || user.email}
                            userEmail={user.email}
                        />
                    </Suspense>
                </SidebarMenuItem>
            </React.Fragment>
        );
    }
}

export function createModule(): WebModule {
    return new Module();
}
