import type React from 'react'

export interface ModuleMetadata {
    id: string
    version: string
    description?: string
    author?: string
}

// Marker inteface for modules that run in the web client
export interface WebModule extends ModuleMetadata { }

export interface GenericModule extends WebModule {
    // Allows the module do some non predefined logic during installation
    // like extending some other module
    install(): void
}

export interface RoutingModule extends WebModule {
    // Called when the routes are created. If not needed, just return an empty fragment '<></>'
    createRoute(): React.ReactElement
}

export interface FullPageModule extends RoutingModule {
    // Needed workaround to make the ModuleManager can identify this as FullPageModule
    readonly moduleType: 'full-page'
}

export interface SidebarModule extends WebModule {
    // Called when the sidebar is created. If not needed, just return an empty fragment '<></>'
    createSidebarItem(): React.ReactElement

    // Called when the sidebar footer is created. If not needed, just return an empty fragment '<></>'
    createSidebarFooterItem(): React.ReactElement
}
