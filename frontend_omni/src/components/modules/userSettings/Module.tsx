import type { RoutingModule, SidebarModule, WebModule } from "@/types/module";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import { Link, Route } from "react-router-dom";
import UserSettings from "@/components/modules/userSettings/UserSettings";

class Module implements RoutingModule, SidebarModule {
    id = 'usersettings';
    version = '1.0.0';
    description = 'User settings page and sidebar navigation';
    author = 'ModAI Team';

    path = '/settings';
    title = "Settings";

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

export function createModule(): WebModule {
    return new Module();
}
