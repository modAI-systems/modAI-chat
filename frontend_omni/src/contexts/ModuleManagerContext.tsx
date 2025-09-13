import React, { createContext, use, useContext } from 'react'
import type { ReactNode } from 'react'
import { ModuleManager } from '@/services/moduleManager'
import type { ModuleMetadata, UseModulesResult } from '@/types/module'
import { useModuleManifest } from '@/services/manifestLoader'

interface ModuleManagerContextType {
    moduleManager: ModuleManager
    modules: ModuleMetadata[]
}

const ModuleManagerContext = createContext<ModuleManagerContextType | null>(null)
const moduleManager = new ModuleManager();

interface ModuleManagerProviderProps {
    children: ReactNode
}

export function ModuleManagerProvider({ children }: ModuleManagerProviderProps) {
    const manifest = useModuleManifest()

    if (manifest && moduleManager.getModules().length === 0) {
        // When using "use" there is an issue that the comonent
        // is re-rendered multiple times, causing multiple loads.
        // So we check if modules are already loaded to avoid that.
        // This is a temporary workaround until someone smarter
        // than me figures out how to fix this properly.
        //
        // Furthermore I use "use" here because with things like
        // useEffect I have issues because then the routes in the
        // App.tsx are not render fully but only the fallback
        // route. When I reload then the page with a path like /login
        // the /login is striped away and replaced with /
        // because the routes are not there yet when the app
        // is first rendered.
        use(moduleManager.loadModulesFromManifest(manifest))
    }

    const contextValue: ModuleManagerContextType = {
        moduleManager,
        modules: moduleManager.getModules(),
    }

    return (
        <ModuleManagerContext value={contextValue}>
            {children}
        </ModuleManagerContext>
    )
}

export function useModuleManagerContext(): ModuleManagerContextType {
    const context = useContext(ModuleManagerContext)
    if (!context) {
        throw new Error('useModuleManagerContext must be used within a ModuleManagerProvider')
    }
    return context
}

export function useModules(): UseModulesResult {
    const { moduleManager } = useModuleManagerContext()

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
