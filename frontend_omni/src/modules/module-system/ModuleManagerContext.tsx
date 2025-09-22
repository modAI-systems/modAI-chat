import { use, useMemo } from 'react'
import type { ReactNode } from 'react'
import { ModuleManagerContext } from '@/moduleif/moduleSystem'
import { ModuleManager } from './moduleManager'
import { fetchManifest } from './moduleManifstLoader';

const moduleManager = new ModuleManager();

interface ModuleManagerProviderProps {
    children: ReactNode
}

export function ModuleManagerProvider({ children }: ModuleManagerProviderProps) {
    const manifest = fetchManifest()

    // Memoize the loading promise to prevent creating new promises on each render
    const loadingPromise = useMemo(() => {
        if (manifest && moduleManager.getModules().length === 0) {
            return moduleManager.loadModulesFromManifest(manifest)
        }
        return Promise.resolve()
    }, [manifest])

    // Use the memoized promise
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
        use(loadingPromise)
    }

    return (
        <ModuleManagerContext value={moduleManager}>
            {children}
        </ModuleManagerContext>
    )
}
