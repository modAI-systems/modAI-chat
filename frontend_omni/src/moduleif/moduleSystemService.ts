/**
 * What this module offers to users:
 *    - Module metadata types and interfaces
 *    - Module manifest types for configuration
 *    - Module manager service for component discovery
 *    - React hooks for accessing loaded modules and components
 *
 * What this module demands when used: None
 *
 * What this module demands from other modules: None
 *
 * Implementation Notes: This module provides the foundational infrastructure
 *     for the dynamic module system. It loads modules from a manifest,
 *     registers their components, and provides discovery mechanisms for
 *     component composition throughout the application.
 */

import { createContext, useContext } from "react";

export const MODULE_SYSTEM_SERVICE_MODULE_CLASS_NAME = "ModuleSystemService";

// Module Metadata Types
export interface ModuleMetadata {
    class: string;
    version: string;
    description?: string;
    author?: string;
    dependentClasses: string[];
    exports: Record<string, unknown>;
}

// Module Manager Service Interface
export interface ModuleManager {
    /**
     * Get a single component of a specific name across all modules.
     * If more than one component with the same name exists, returns null.
     */
    getOne<T>(name: string): T | null;

    /**
     * Get all elements of a specific name across all modules
     */
    getAll<T>(name: string): T[];
}

// Create context for the module manager
export const ModuleManagerContext = createContext<ModuleManager | null>(null);

/**
 * Hook to access modules and component discovery functionality
 *
 * @returns ModuleManager instance
 */
export function useModules(): ModuleManager {
    const context = useContext(ModuleManagerContext);
    if (!context) {
        throw new Error(
            "useModules must be used within a ModuleManagerProvider"
        );
    }
    return context;
}
