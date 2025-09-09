import type { GenericModule } from "@/types/module";
import { Link, Route, useSearchParams } from "react-router-dom";
import ChatComponent from "./ChatComponent";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Plus } from "lucide-react";

class Module implements GenericModule {
    id = 'chat';
    version = '1.0.0';
    description = 'AI Chat interface with configurable providers and models';
    author = 'ModAI Team';
    requiredModules = [];

    path = '/chat';
    title = "New Chat";

    install(): void {
        // Not needed
    }

    createRoute(): React.ReactElement {
        return <Route
            key={this.id}
            path={this.path}
            element={<ChatComponentWrapper />}
        />
            ;
    }

    createSidebarItem(): React.ReactElement {
        return <SidebarMenuItem key={this.id}>
            <SidebarMenuButton asChild tooltip={this.title}>
                <Link
                    to={`${this.path}?t=${Date.now()}`}
                >
                    <Plus />
                    <span>{this.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem >;
    }
}

// Wrapper component that uses the URL parameter as a key to force re-rendering
function ChatComponentWrapper() {
    const [searchParams] = useSearchParams();
    const timeParam = searchParams.get('t') || '0';

    return <ChatComponent key={timeParam} />;
}

export function createModule(): GenericModule {
    return new Module()
}
