import type { ContextProviderModule, WebModule } from '@/types/module'
import React from 'react'
import { SessionProvider } from './SessionProvider'

class Module implements ContextProviderModule {
    id = 'session'
    version = '1.0.0'
    description = 'Session management module that maintains user session state in the browser'
    author = 'ModAI Team'
    dependentModules = []

    install() {
        // Not needed
    }

    createContextProvider(children: React.ReactNode): React.ReactElement {
        return <SessionProvider>{children}</SessionProvider>
    }
}

export function createModule(): WebModule {
    return new Module()
}

export function moduleDependencies(): string[] {
    return [];
}
