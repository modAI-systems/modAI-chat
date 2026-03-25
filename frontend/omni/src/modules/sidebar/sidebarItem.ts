import type { Component } from "svelte";

/**
 * The module type registered in modules*.json for sidebar setting items.
 * Used by the Sidebar: getModules().getAll<SidebarSettingItem>("SidebarSettingItem")
 */
export const SIDEBAR_SETTING_ITEM_TYPE = "SidebarSettingItem";

/**
 * Descriptor for a sidebar settings menu entry.
 * Each module that wants to appear in the sidebar settings registers one of these.
 */
export interface SidebarSettingItem {
    title: string;
    url: string;
    icon?: Component;
}

/**
 * The module type registered in modules*.json for the sidebar user item.
 * Used by the Sidebar: getModules().getOne<SidebarUserItem>("SidebarUserItem")
 */
export const SIDEBAR_USER_ITEM_TYPE = "SidebarUserItem";

/**
 * Descriptor for the sidebar user entry displayed in the footer.
 */
export interface SidebarUserItem {
    name: string;
    email: string;
    avatar: string;
}
