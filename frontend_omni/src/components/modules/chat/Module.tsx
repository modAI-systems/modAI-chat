import { type SidebarModule, type RoutingModule, type WebModule } from "@/types/module";
import { Link, Route } from "react-router-dom";
import ChatComponent from "./ChatComponent";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Plus } from "lucide-react";

class Module implements RoutingModule, SidebarModule {
    id = 'chat';
    version = '1.0.0';
    description = 'AI Chat interface with configurable providers and models';
    author = 'ModAI Team';
    dependentModules = ["session"];

    path = '/chat';
    title = "New Chat";

    install() {
        // Not needed
    }

    createRoute(): React.ReactElement {
        return <Route
            key={this.id}
            path={this.path}
            element={<ChatComponent />}
        />
            ;
    }

    createSidebarItem(): React.ReactElement | null {
        return <SidebarMenuItem key={this.id}>
            <SidebarMenuButton asChild tooltip={this.title}>
                <Link to={`${this.path}`}>
                    <Plus />
                    <span>{this.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem >;
    }

    createSidebarFooterItem(): React.ReactElement | null {
        return null;
    }
}

export function createModule(): WebModule {
    return new Module()
}
