/**
 * Module Name: User Settings Service
 *
 * Module Types: Service Provider (NO UI)
 *
 * Description: This module provides user settings management functionality,
 *      interfacing with the backend to retrieve and update user-specific settings
 *      organized by module/category. This is a pure service module that only
 *      handles REST API communication and data management.
 *
 * What this module offers to users:
 *    - User settings service functions (get and update settings by module)
 *    - User settings data types and interfaces
 *    - React hook to access user settings throughout the application
 *    - Central data store for user settings across all modules
 *
 * What this module demands when used: None
 *
 * What this module demands from other modules:
 *    - Session module: Uses session context to get current user information
 *
 * Implementation Notes: This module provides a service layer that communicates
 *     with the backend user settings API endpoints (GET/PUT). It maintains local
 *     cache of settings and provides methods to get and update settings by module name.
 *
 * Data Structure: User settings are organized as:
 * {
 *   "some_module": { ...module-specific settings... },
 *   "other_module": { ...module-specific settings... },
 *   "theme": { "mode": "dark", "primaryColor": "#123456" },
 *   "notifications": { "enabled": true, "frequency": "daily" }
 * }
 */

import { createContext, useContext } from "react";

// User Settings Types
export interface UserSettings {
    [moduleName: string]: { [key: string]: any };
}

export interface UserSettingsContextType {
    /**
     * Get all user settings
     */
    getAllSettings(): UserSettings;

    /**
     * Get settings for a specific module
     *
     * @param moduleName The name of the module to get settings for
     * @returns Settings object for the specified module, or empty object if not found
     */
    getModuleSettings(moduleName: string): { [key: string]: any };

    /**
     * Update settings for a specific module
     *
     * @param moduleName The name of the module to update settings for
     * @param settings The settings object to update
     * @returns Promise that resolves when settings are updated
     */
    updateModuleSettings(moduleName: string, settings: { [key: string]: any }): Promise<void>;

    /**
     * Refresh user settings from the backend
     */
    refreshSettings(): Promise<void>;

    /**
     * Whether settings are currently being loaded
     */
    isLoading: boolean;

    /**
     * Error message if settings loading/updating failed
     */
    error: string | null;
}

// Create context for the user settings service
export const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

/**
 * Hook to access the user settings service from any component
 *
 * @returns UserSettingsContextType instance
 * @throws Error if used outside of UserSettingsProvider
 */
export function useUserSettings(): UserSettingsContextType {
    const context = useContext(UserSettingsContext);
    if (!context) {
        throw new Error('useUserSettings must be used within a UserSettingsProvider');
    }
    return context;
}
