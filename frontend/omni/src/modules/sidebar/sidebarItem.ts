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
 * The module type registered in modules*.json for sidebar footer items.
 * Each footer item is a Svelte component rendered in the sidebar footer area.
 * Used by the Sidebar: getModules().getAll<SidebarFooterItem>("SidebarFooterItem")
 */
export const SIDEBAR_FOOTER_ITEM_TYPE = "SidebarFooterItem";

/**
 * A sidebar footer item is a Svelte component rendered in the sidebar footer area.
 */
export type SidebarFooterItem = Component;
