import type { GenericModule } from "@/types/module";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import { Link, Route } from "react-router-dom";
import UserSettings from "@/components/modules/userSettings/UserSettings";

class Module implements GenericModule {
    id = 'usersettings';
    version = '1.0.0';
    description = 'User settings page and sidebar navigation';
    author = 'ModAI Team';
    requiredModules = [];

    path = '/settings';
    title = "Settings";

    install(): void {
        // Not needed
    }

    createRoute(): React.ReactElement {
        return (
            <Route
                key={this.id}
                path={this.path}
                element={<UserSettings />}
            />
        );
    }

    createSidebarItem(): React.ReactElement {
        return <></>; // Not needed
    }

    createSidebarFooterItem(): React.ReactElement {
        return (
            <SidebarMenuItem key={this.id}>
                <SidebarMenuButton asChild tooltip={this.title}>
                    <Link to={this.path}>
                        <Settings />
                        <span>{this.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }
}

export function createModule(): GenericModule {
    return new Module();
}
