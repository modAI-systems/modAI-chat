import type React from 'react'

// Essential metadata - this is all we need to define upfront
export interface ModuleMetadata {
    id: string
    version: string
    description?: string
    author?: string
    dependentModules: string[]
    components: any[]
}

// Simple hook result interface
export interface UseModulesResult {
    getModuleById(id: string): ModuleMetadata | null
    has(moduleId: string, componentName: string): boolean
    get<T = React.ComponentType<any>>(moduleId: string, componentName: string): T | null
    // getComponentsByName<T = React.ComponentType<any>>(componentName: string): T[]
    getComponentsByName(componentName: string): any[]
}
