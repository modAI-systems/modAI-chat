import type { Component } from "svelte";

/**
 * The module type registered in modules*.json for sidebar setting items.
 * Used by SidebarSettings: getModules().getAll<SidebarSettingItem>("SidebarSettingItem")
 */
export const SIDEBAR_SETTING_ITEM_TYPE = "SidebarSettingItem";

/**
 * Descriptor for a sidebar settings menu entry.
 * Each module that wants to appear in the settings group registers one of these.
 */
export interface SidebarSettingItem {
    title: string;
    url: string;
    icon?: Component;
}
