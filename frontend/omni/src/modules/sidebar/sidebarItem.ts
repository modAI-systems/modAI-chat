import type { Component } from "svelte";

/**
 * The module type registered in modules*.json for sidebar items.
 * Used by the Sidebar: getModules().getAll<SidebarItem>("SidebarItem")
 */
export const SIDEBAR_ITEM_TYPE = "SidebarItem";

/**
 * Descriptor for a sidebar menu entry.
 * Each module that wants to appear in the sidebar registers one of these.
 */
export interface SidebarItem {
    title: string;
    url: string;
    icon?: Component;
}
