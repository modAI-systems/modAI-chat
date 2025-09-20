/**
 * User Settings Service Implementation
 *
 * Handles communication with the backend user settings API
 * and manages local state for user settings.
 */

import type { UserSettings } from "@/moduleif/userSettingsService";

export class UserSettingsService {
    private settings: UserSettings = {};
    private currentUserId: string | null = null;

    /**
     * Initialize the service with user ID
     */
    public setUserId(userId: string): void {
        this.currentUserId = userId;
    }

    /**
     * Get all user settings from the backend
     */
    public async fetchAllSettings(): Promise<UserSettings> {
        if (!this.currentUserId) {
            throw new Error('User ID not set. Cannot fetch settings.');
        }

        try {
            const response = await fetch(`/api/v1/user/${this.currentUserId}/settings`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required');
                }
                if (response.status === 403) {
                    throw new Error('Access forbidden');
                }
                if (response.status === 404) {
                    throw new Error('User not found');
                }
                throw new Error(`Failed to fetch settings: ${response.status}`);
            }

            const data = await response.json();
            this.settings = data.settings || {};
            return this.settings;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Unknown error occurred while fetching settings');
        }
    }

    /**
     * Get settings for a specific module
     */
    public getModuleSettings(moduleName: string): { [key: string]: any } {
        return this.settings[moduleName] || {};
    }

    /**
     * Get all settings
     */
    public getAllSettings(): UserSettings {
        return { ...this.settings };
    }

    /**
     * Update settings for a specific module
     */
    public async updateModuleSettings(
        moduleName: string,
        moduleSettings: { [key: string]: any }
    ): Promise<void> {
        if (!this.currentUserId) {
            throw new Error('User ID not set. Cannot update settings.');
        }

        try {
            const response = await fetch(
                `/api/v1/user/${this.currentUserId}/settings/${moduleName}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        settings: moduleSettings,
                    }),
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required');
                }
                if (response.status === 403) {
                    throw new Error('Access forbidden');
                }
                if (response.status === 404) {
                    throw new Error('User not found');
                }
                if (response.status === 422) {
                    throw new Error('Invalid settings data');
                }
                throw new Error(`Failed to update settings: ${response.status}`);
            }

            const data = await response.json();
            // Update local cache with the returned settings
            this.settings[moduleName] = data.settings || {};
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Unknown error occurred while updating settings');
        }
    }

    /**
     * Update multiple modules' settings at once
     */
    public async updateAllSettings(settings: UserSettings): Promise<void> {
        if (!this.currentUserId) {
            throw new Error('User ID not set. Cannot update settings.');
        }

        try {
            const response = await fetch(`/api/v1/user/${this.currentUserId}/settings`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    settings: settings,
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required');
                }
                if (response.status === 403) {
                    throw new Error('Access forbidden');
                }
                if (response.status === 404) {
                    throw new Error('User not found');
                }
                if (response.status === 422) {
                    throw new Error('Invalid settings data');
                }
                throw new Error(`Failed to update settings: ${response.status}`);
            }

            const data = await response.json();
            // Update local cache with the returned settings
            this.settings = data.settings || {};
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Unknown error occurred while updating settings');
        }
    }
}
