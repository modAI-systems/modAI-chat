import type { SidebarModule, WebModule } from "@/types/module";
import React from "react";
import { UserDisplaySidebarItem } from "./UserDisplaySidebarItem";


class Module implements SidebarModule {
    id = 'userprofileitem';
    version = '1.0.0';
    description = 'User profile display in sidebar footer';
    author = 'ModAI Team';

    createSidebarItem(): React.ReactElement | null {
        return null; // Not needed
    }

    createSidebarFooterItem(): React.ReactElement | null {
        return <UserDisplaySidebarItem key={this.id} />;
    }
}

export function createModule(): WebModule {
    return new Module();
}
