import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ModuleManager } from '@/services/moduleManager'
import type { ModuleMetadata, UseModulesResult } from '@/types/module'

interface ModuleManagerContextType {
    moduleManager: ModuleManager
    modules: ModuleMetadata[]
}

const ModuleManagerContext = createContext<ModuleManagerContextType | null>(null)

interface ModuleManager2ProviderProps {
    children: ReactNode
}

export function ModuleManagerProvider({ children }: ModuleManager2ProviderProps) {
    const [moduleManager] = useState(() => new ModuleManager())
    const [modules, setModules] = useState<ModuleMetadata[]>([])

    const loadModules = async () => {
        try {
            await moduleManager.loadFromManifest()
            setModules(moduleManager.getModules())
        } catch (err) {
            console.error('Failed to load modules:', err)
        }
    }

    useEffect(() => {
        loadModules()
    }, [])

    const contextValue: ModuleManagerContextType = {
        moduleManager,
        modules,
    }

    return (
        <ModuleManagerContext.Provider value={contextValue}>
            {children}
        </ModuleManagerContext.Provider>
    )
}

export function useModuleManagerContext(): ModuleManagerContextType {
    const context = useContext(ModuleManagerContext)
    if (!context) {
        throw new Error('useModuleManager2Context must be used within a ModuleManager2Provider')
    }
    return context
}

export function useModules(): UseModulesResult {
    const { moduleManager } = useModuleManagerContext()

    // Utility methods - all complexity handled by moduleManager2
    const getModuleById = (id: string): ModuleMetadata | null => {
        return moduleManager.getModuleById(id)
    }

    const has = (moduleId: string, componentName: string): boolean => {
        return moduleManager.has(moduleId, componentName)
    }

    const get = <T = React.ComponentType<any>>(moduleId: string, componentName: string): T | null => {
        return moduleManager.get<T>(moduleId, componentName)
    }

    const getComponentsByName = <T = React.ComponentType<any>>(componentName: string): T[] => {
        return moduleManager.getComponentsByName<T>(componentName)
    }

    return {
        getModuleById,
        has,
        get,
        getComponentsByName,
    }
}
