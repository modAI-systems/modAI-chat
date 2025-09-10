import type { GenericModule } from "@/types/module";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { UserDisplay } from "@/components/modules/userProfileItem/UserProfileItem";
import { LogOut } from "lucide-react";
import React from "react";

class Module implements GenericModule {
    id = 'userprofileitem';
    version = '1.0.0';
    description = 'User profile display and logout functionality in sidebar footer';
    author = 'ModAI Team';
    requiredModules = [];

    private handleLogout = () => {
        // TODO: Implement actual logout logic
        console.log("Logging out...")
        // You can add your logout logic here
    }

    install(): void {
        // Not needed
    }

    createRoute(): React.ReactElement {
        return <></>; // Not needed
    }

    createSidebarItem(): React.ReactElement {
        return <></>; // Not needed
    }

    createSidebarFooterItem(): React.ReactElement {
        return (
            <React.Fragment key={this.id}>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={this.handleLogout} tooltip="Log out">
                        <LogOut />
                        <span>Log out</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <UserDisplay username="John Doe" userEmail="john@example.com" />
                </SidebarMenuItem>
            </React.Fragment>
        );
    }
}

export function createModule(): GenericModule {
    return new Module();
}
