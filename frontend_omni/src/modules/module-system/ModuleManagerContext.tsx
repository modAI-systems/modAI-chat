import type { ReactNode } from 'react'
import { ModuleManagerContext, useModules } from '@/moduleif/moduleSystem'
import { useModuleManagerFromManifest } from './moduleManager'
import { useManifest } from './moduleManifstLoader';

interface ModuleManagerProviderProps {
    children: ReactNode
}

export function ModuleManagerProvider({ children }: ModuleManagerProviderProps) {
    const manifest = useManifest()
    const moduleManager = useModuleManagerFromManifest(manifest)

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
