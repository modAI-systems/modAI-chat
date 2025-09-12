import type React from 'react'

export interface ModuleMetadata {
    id: string
    version: string
    description?: string
    author?: string
    dependentModules: string[]
}

export interface ModuleExports {
    createModule(): WebModule
    moduleDependencies?(): string[]
}

// Marker inteface for modules that run in the web client
export interface WebModule extends ModuleMetadata {
    // Allows the module do some non predefined logic during installation
    // like extending some other module
    install(): void
}

export interface ContextProviderModule extends WebModule {
    // Called when the context providers are created. If not needed, just return an empty fragment '<></>'
    createContextProvider(children: React.ReactNode): React.ReactElement
}

export interface RoutingModule extends WebModule {
    // Called when the routes are created. If not needed, just return an empty fragment '<></>'
    createRoute(): React.ReactElement
}

export interface FullPageModule extends WebModule {
    createFullPageRoute(): React.ReactElement
}

export interface SidebarModule extends WebModule {
    // Called when the sidebar is created. If not needed, just return null or undefined
    createSidebarItem(): React.ReactElement | null

    // Called when the sidebar footer is created. If not needed, just return null or undefined
    createSidebarFooterItem(): React.ReactElement | null
}
