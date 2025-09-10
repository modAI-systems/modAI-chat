import type React from 'react'

export interface ModuleMetadata {
    id: string
    version: string
    description?: string
    author?: string
    requiredModules: string[]
}

// Module type for a generic module without further specification
// This can be used for modules that do not fit into the other categories
// e.g. to install some logic into existing modules which are extensible
export interface GenericModule extends ModuleMetadata {
    // Allows the module do some non predefined logic during installation
    // like extending some other module
    install(): void

    // Called when the routes are created. If not needed, just return an empty fragment '<></>'
    createRoute(): React.ReactElement

    // Called when the sidebar is created. If not needed, just return an empty fragment '<></>'
    createSidebarItem(): React.ReactElement

    // Called when the sidebar footer is created. If not needed, just return an empty fragment '<></>'
    createSidebarFooterItem(): React.ReactElement
}
