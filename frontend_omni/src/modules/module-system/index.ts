import { createContext, useContext } from "react";

// Module Manager Service Interface
export interface ModuleManager {
    /**
     * Get a single component of a specific type across all modules.
     * If more than one component with the same type exists, returns null.
     */
    getOne<T>(type: string): T | null;

    /**
     * Get all elements of a specific type across all modules
     */
    getAll<T>(type: string): T[];
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
            "useModules must be used within a ModuleManagerProvider",
        );
    }
    return context;
}
