import type { GenericModule, FullPageModule, RoutingModule, SidebarModule, WebModule } from '../types/module'

class ModuleManager {
    private modules: WebModule[] = []

    getAllModules(): WebModule[] {
        return [...this.modules]
    }

    getSidebarModules(): SidebarModule[] {
        return this.modules.filter((module): module is SidebarModule =>
            'createSidebarItem' in module && 'createSidebarFooterItem' in module
        )
    }

    getGenericModules(): GenericModule[] {
        return this.modules.filter((module): module is GenericModule =>
            'install' in module && typeof module.install === 'function'
        )
    }

    getRoutingModules(): RoutingModule[] {
        return this.modules.filter((module): module is RoutingModule =>
            'createRoute' in module && typeof module.createRoute === 'function'
        )
    }

    getFullPageModules(): FullPageModule[] {
        return this.modules.filter((module): module is FullPageModule =>
            'createFullPageRoute' in module && typeof module.createFullPageRoute === 'function'
        )
    }

    registerModule(module: WebModule): void {
        // Check if module with same ID already exists to prevent duplicates during hot reload
        const existingIndex = this.modules.findIndex(m => m.id === module.id)
        if (existingIndex >= 0) {
            // Replace existing module with new instance
            this.modules[existingIndex] = module
        } else {
            this.modules.push(module)
        }
    }
}

// Singleton instance
export const moduleManager = new ModuleManager()
