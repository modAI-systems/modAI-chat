import React, { createContext, useContext, useState, useMemo } from 'react'
import { ModuleManager } from '../services/moduleManager'
import { registerBuiltInModules } from '../services/builtInModules'
import type { WebModule, RoutingModule, FullPageModule, SidebarModule, GenericModule, ContextProviderModule } from '../types/module'

interface WebModulesContextType {
    allModules: WebModule[]
    routingModules: RoutingModule[]
    fullPageModules: FullPageModule[]
    sidebarModules: SidebarModule[]
    genericModules: GenericModule[]
    contextProviderModules: ContextProviderModule[]
    moduleManager: ModuleManager
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
    const [genericModules, setGenericModules] = useState<GenericModule[]>([])
    const [contextProviderModules, setContextProviderModules] = useState<ContextProviderModule[]>([])

    // Create module manager instance with setters
    const moduleManager = useMemo(() => {
        const mgr = new ModuleManager({
            setAllModules,
            setRoutingModules,
            setFullPageModules,
            setSidebarModules,
            setGenericModules,
            setContextProviderModules,
        });
        registerBuiltInModules(mgr);
        return mgr
    }, [])

    const contextValue: WebModulesContextType = {
        allModules,
        routingModules,
        fullPageModules,
        sidebarModules,
        genericModules,
        contextProviderModules,
        moduleManager,
    }

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
