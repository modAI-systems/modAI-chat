import type { ReactNode } from 'react'
import { ModuleManagerContext, useModules } from '@/moduleif/moduleSystem'
import { newModuleManagerFromManifest } from './moduleManager'
import { fetchManifest } from './moduleManifstLoader';

interface ModuleManagerProviderProps {
    children: ReactNode
}

export function ModuleManagerProvider({ children }: ModuleManagerProviderProps) {
    const manifest = fetchManifest()
    const moduleManager = newModuleManagerFromManifest(manifest)

    return (
        <ModuleManagerContext value={moduleManager}>
            {children}
        </ModuleManagerContext>
    )
}

export function ModuleContextProviders({ children, name }: { children: React.ReactNode; name: string }) {
    const modules = useModules()

    const contextProviders = modules.getComponentsByName(name)

    // Wrap children with all context provider modules
    return contextProviders.reduce(
        (wrappedChildren, Component) => <Component>{wrappedChildren}</Component>,
        children
    )
}
