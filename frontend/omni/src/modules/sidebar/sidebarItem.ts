import type { Component } from "svelte";

/**
 * The module type registered in modules*.json for sidebar content items.
 * Each content item is a Svelte component rendered in the sidebar content area.
 * Used by the Sidebar: getModules().getAll<SidebarContentItem>("SidebarContentItem")
 */
export const SIDEBAR_CONTENT_ITEM_TYPE = "SidebarContentItem";

/**
 * A sidebar content item is a Svelte component rendered in the sidebar content area.
 */
export type SidebarContentItem = Component;

/**
 * The module type registered in modules*.json for the sidebar footer item.
 * Used by the Sidebar: getModules().getOne<SidebarFooterItem>("SidebarFooterItem")
 */
export const SIDEBAR_FOOTER_ITEM_TYPE = "SidebarFooterItem";

/**
 * Descriptor for the sidebar footer entry.
 */
export interface SidebarFooterItem {
    name: string;
    email: string;
    avatar: string;
}
