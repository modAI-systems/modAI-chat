import { type GenericModule, type FullPageModule, type RoutingModule, type SidebarModule, type WebModule } from '../types/module'

interface ModuleSetters {
    setAllModules: (modules: WebModule[]) => void
    setRoutingModules: (modules: RoutingModule[]) => void
    setFullPageModules: (modules: FullPageModule[]) => void
    setSidebarModules: (modules: SidebarModule[]) => void
    setGenericModules: (modules: GenericModule[]) => void
}

function isRoutingModule(module: WebModule): module is RoutingModule {
    return 'createRoute' in module && typeof module.createRoute === 'function'
}

function isFullPageModule(module: WebModule): module is FullPageModule {
    return 'createFullPageRoute' in module && typeof module.createFullPageRoute === 'function'
}

function isSidebarModule(module: WebModule): module is SidebarModule {
    return 'createSidebarItem' in module && 'createSidebarFooterItem' in module
}

function isGenericModule(module: WebModule): module is GenericModule {
    return 'install' in module && typeof module.install === 'function'
}

export class ModuleManager {
    private registeredModulesById = new Map<string, WebModule>();
    private activeModulesById = new Map<string, WebModule>();

    private moduleSetters: ModuleSetters

    constructor(moduleSetters: ModuleSetters) {
        this.moduleSetters = moduleSetters
    }

    getAllModules(): WebModule[] {
        return [...this.registeredModulesById.values()]
    }

    registerModule(module: WebModule): void {
        this.registeredModulesById.set(module.id, module);
    }

    unregisterModule(moduleId: string) {
        this.activeModulesById.delete(moduleId);
        this.registeredModulesById.delete(moduleId);
    }

    activateModule(moduleId: string): void {
        const updatedModule = this.registeredModulesById.get(moduleId);
        if (!updatedModule) {
            return;
        }

        this.activeModulesById.set(moduleId, updatedModule)

        this.moduleActivationChangedd(updatedModule)
    }

    deactivateModule(moduleId: string): void {
        const updatedModule = this.registeredModulesById.get(moduleId);
        if (!updatedModule) {
            return;
        }

        this.activeModulesById.delete(moduleId)

        this.moduleActivationChangedd(updatedModule)
    }

    private moduleActivationChangedd(updatedModule: WebModule) {
        const allModules = [...this.activeModulesById.values()]
        this.moduleSetters.setAllModules(allModules)

        if (isRoutingModule(updatedModule)) {
            const routingModules = allModules.filter(isRoutingModule)
            this.moduleSetters.setRoutingModules(routingModules)
        }
        if (isFullPageModule(updatedModule)) {
            const fullPageModules = allModules.filter(isFullPageModule)
            this.moduleSetters.setFullPageModules(fullPageModules)
        }
        if (isSidebarModule(updatedModule)) {
            const sidebarModules = allModules.filter(isSidebarModule)
            this.moduleSetters.setSidebarModules(sidebarModules)
        }
        if (isGenericModule(updatedModule)) {
            const genericModules = allModules.filter(isGenericModule)
            this.moduleSetters.setGenericModules(genericModules)
        }
    }
}

