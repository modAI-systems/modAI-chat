/**
 * User Settings Service Context Provider
 *
 * Provides the UserSettingsService instance to the entire application
 * via React Context, managing user settings state and operations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { type UserSettingsContextType, type UserSettings, UserSettingsContext, type ModuleSettings } from "@/moduleif/userSettingsService";
import { useSession } from "@/moduleif/sessionContext";
import { UserSettingsService } from './UserSettingsService';

/**
 * Context provider that makes the user settings service available
 * throughout the application component tree
 */
export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
    const { session } = useSession();
    const [userSettingsService] = useState(() => new UserSettingsService());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshSettings = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await userSettingsService.fetchAllSettings();
            // Settings are now cached in the service instance
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
            setError(errorMessage);
            console.error('Failed to refresh user settings:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userSettingsService]);

    // Initialize service when session changes
    useEffect(() => {
        if (session) {
            const user = session.getUser();
            userSettingsService.setUserId(user.id);
            refreshSettings();
        } else {
            // Clear settings when user logs out
            setError(null);
        }
    }, [session, userSettingsService, refreshSettings]);

    const getAllSettings = useCallback((): UserSettings => {
        return userSettingsService.getAllSettings();
    }, [userSettingsService]);

    const getModuleSettings = useCallback((moduleName: string): ModuleSettings => {
        return userSettingsService.getModuleSettings(moduleName);
    }, [userSettingsService]);

    const updateModuleSettings = useCallback(async (
        moduleName: string,
        moduleSettings: ModuleSettings
    ): Promise<void> => {
        setError(null);

        try {
            await userSettingsService.updateModuleSettings(moduleName, moduleSettings);
            // Settings are updated in the service instance
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
            setError(errorMessage);
            throw err;
        }
    }, [userSettingsService]);

    const contextValue: UserSettingsContextType = {
        getAllSettings,
        getModuleSettings,
        updateModuleSettings,
        refreshSettings,
        isLoading,
        error,
    };

    return (
        <UserSettingsContext value={contextValue}>
            {children}
        </UserSettingsContext>
    );
}
