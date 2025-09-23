import type { ReactNode } from 'react'
import { ModuleManagerContext } from '@/moduleif/moduleSystem'
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
