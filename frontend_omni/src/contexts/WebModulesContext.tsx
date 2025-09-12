import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { ModuleManager } from '../services/moduleManager'
import type { WebModule, RoutingModule, FullPageModule, SidebarModule, ContextProviderModule } from '../types/module'

interface WebModulesContextType {
    allModules: WebModule[]
    routingModules: RoutingModule[]
    fullPageModules: FullPageModule[]
    sidebarModules: SidebarModule[]
    contextProviderModules: ContextProviderModule[]
    moduleManager: ModuleManager
    isLoading: boolean
    error: string | null
    // Dynamic module access - modules can be accessed by their ID or ID + "Module"
    [key: string]: any
}

const WebModulesContext = createContext<WebModulesContextType | undefined>(undefined)

interface WebModuleProviderProps {
    children: React.ReactNode
}

export function WebModuleProvider({ children }: WebModuleProviderProps) {
    const [allModules, setAllModules] = useState<WebModule[]>([])
    const [routingModules, setRoutingModules] = useState<RoutingModule[]>([])
    const [fullPageModules, setFullPageModules] = useState<FullPageModule[]>([])
    const [sidebarModules, setSidebarModules] = useState<SidebarModule[]>([])
    const [contextProviderModules, setContextProviderModules] = useState<ContextProviderModule[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Create module manager instance with setters
    const moduleManager = useMemo(() => {
        return new ModuleManager({
            setAllModules,
            setRoutingModules,
            setFullPageModules,
            setSidebarModules,
            setContextProviderModules,
        });
    }, [])

    useEffect(() => {
        const loadModules = async () => {
            try {
                setIsLoading(true)
                setError(null)
                await moduleManager.loadFromManifest()
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
                setError(errorMessage)
                console.error('Failed to load modules from manifest:', err)
            } finally {
                setIsLoading(false)
            }
        }

        loadModules()
    }, [moduleManager])

    const contextValue: WebModulesContextType = {
        allModules,
        routingModules,
        fullPageModules,
        sidebarModules,
        contextProviderModules,
        moduleManager,
        isLoading,
        error,
    }

    // Add dynamic module access properties
    allModules.forEach(module => {
        // Create camelCase property name: "session" -> "sessionModule"
        const modulePropertyName = `${module.id}Module`
        contextValue[modulePropertyName] = module
    })

    return (
        <WebModulesContext.Provider value={contextValue}>
            {children}
        </WebModulesContext.Provider>
    )
}

export function useWebModules() {
    const context = useContext(WebModulesContext)
    if (context === undefined) {
        throw new Error('useWebModules must be used within a WebModulesProvider')
    }
    return context
}

/**
 * Hook to access active modules dynamically
 *
 * @returns Object with modules accessible by their names
 *
 * @example
 * const { sessionModule, chatModule } = useModules()
 */
export function useModules() {
    return useWebModules()
}

/**
 * Type-safe hook for accessing specific modules with better TypeScript support
 */
export function useModule<T extends WebModule = WebModule>(moduleId: string): T | undefined {
    const context = useWebModules()
    return context[moduleId] as T | undefined
}
