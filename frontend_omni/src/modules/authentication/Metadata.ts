import { AuthRouterEntry } from "./AuthRouterEntry";
import type { ModuleMetadata } from "@/moduleif/moduleSystemService";
import {
    MAIN_ROUTER_ENTRY_MODULE_CLASS_NAME,
    MAIN_SIDEBAR_FOOTER_ITEM_MODULE_CLASS_NAME,
} from "@/moduleif/mainLayout";
import { AuthSidebarFooterItem } from "./AuthSidebarFooterItem";

export const Metadata: ModuleMetadata = {
    version: "1.0.0",
    description:
        "User authentication pages (login and register) and logout functionality",
    author: "ModAI Team",
    dependentClasses: [],
    exports: {
        [MAIN_SIDEBAR_FOOTER_ITEM_MODULE_CLASS_NAME]: {
            position: 1000,
            component: AuthSidebarFooterItem,
        },
        [MAIN_ROUTER_ENTRY_MODULE_CLASS_NAME]: AuthRouterEntry,
    },
};
