import type { SidebarModule, RoutingModule, WebModule } from "@/types/module";
import { Link, Route, useSearchParams } from "react-router-dom";
import ChatComponent from "./ChatComponent";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Plus } from "lucide-react";

class Module implements RoutingModule, SidebarModule {
    id = 'chat';
    version = '1.0.0';
    description = 'AI Chat interface with configurable providers and models';
    author = 'ModAI Team';

    path = '/chat';
    title = "New Chat";

    createRoute(): React.ReactElement {
        return <Route
            key={this.id}
            path={this.path}
            element={<ChatComponentWrapper />}
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

// Wrapper component that uses the URL parameter as a key to force re-rendering
function ChatComponentWrapper() {
    const [searchParams] = useSearchParams();
    const timeParam = searchParams.get('t') || '0';

    return <ChatComponent key={timeParam} />;
}

export function createModule(): WebModule {
    return new Module()
}
