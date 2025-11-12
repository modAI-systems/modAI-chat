import { createContext, useContext } from "react";

// Modules Service Interface
export interface Modules {
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

// Create context for the modules
export const ModulesContext = createContext<Modules | null>(null);

/**
 * Hook to access modules and component discovery functionality
 *
 * @returns Modules instance
 */
export function useModules(): Modules {
    const context = useContext(ModulesContext);
    if (!context) {
        throw new Error("useModules must be used within a ModulesProvider");
    }
    return context;
}
