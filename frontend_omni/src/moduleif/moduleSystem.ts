/**
 * Module Name: Module System
 *
 * Module Types: Service Provider
 *
 * Description: This module provides the core module management functionality,
 *      including module loading, component discovery, and dynamic module composition.
 *
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

import type React from 'react'
import { createContext, useContext } from 'react'

// Module Metadata Types
export interface ModuleMetadata {
    id: string
    version: string
    description?: string
    author?: string
    dependentModules: string[]
    components: React.ComponentType<any>[]
}

// Module Manager Service Interface
export interface ModuleManager {
    /**
     * Get all loaded module metadata
     */
    getModules(): ModuleMetadata[]

    /**
     * Get a module metadata by ID
     */
    getModuleById(id: string): ModuleMetadata | null

    /**
     * Check if a module has a specific component
     */
    has(moduleId: string, componentName: string): boolean

    /**
     * Get a specific component from a specific module
     */
    get<T = React.ComponentType<any>>(moduleId: string, componentName: string): T | null

    /**
     * Get all components of a specific name across all modules
     */
    getComponentsByName<T = React.ComponentType<any>>(componentName: string): T[]
}

// Create context for the module manager
export const ModuleManagerContext = createContext<ModuleManager | null>(null)

/**
 * Hook to access modules and component discovery functionality
 *
 * @returns ModuleManager instance
 */
export function useModules(): ModuleManager {
    const context = useContext(ModuleManagerContext)
    if (!context) {
        throw new Error('useModules must be used within a ModuleManagerProvider')
    }
    return context
}
