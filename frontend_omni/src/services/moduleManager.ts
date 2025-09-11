import { type GenericModule, type FullPageModule, type RoutingModule, type SidebarModule, type WebModule, type ContextProviderModule } from '../types/module'

interface ModuleSetters {
    setAllModules: (modules: WebModule[]) => void
    setRoutingModules: (modules: RoutingModule[]) => void
    setFullPageModules: (modules: FullPageModule[]) => void
    setSidebarModules: (modules: SidebarModule[]) => void
    setGenericModules: (modules: GenericModule[]) => void
    setContextProviderModules: (modules: ContextProviderModule[]) => void
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

function isContextProviderModule(module: WebModule): module is ContextProviderModule {
    return 'createContextProvider' in module && typeof module.createContextProvider === 'function'
}

export class ModuleManager {
    private registeredModulesById = new Map<string, WebModule>();
    private activeModulesById = new Map<string, WebModule>();

    private moduleSetters: ModuleSetters

    constructor(moduleSetters: ModuleSetters) {
        this.moduleSetters = moduleSetters
    }

    /**
     * Check if all dependencies of a module are currently active
     */
    private areDependenciesActive(module: WebModule): boolean {
        return module.dependentModules.every(depId => this.activeModulesById.has(depId));
    }

    /**
     * Find all active modules that depend on the given module
     */
    private findDependentModules(moduleId: string): WebModule[] {
        const dependents: WebModule[] = [];
        for (const activeModule of this.activeModulesById.values()) {
            if (activeModule.dependentModules.includes(moduleId)) {
                dependents.push(activeModule);
            }
        }
        return dependents;
    }

    /**
     * Recursively deactivate all modules that depend on the given module
     */
    private deactivateDependentModules(moduleId: string): void {
        const dependentModules = this.findDependentModules(moduleId);
        for (const dependentModule of dependentModules) {
            this.deactivateModule(dependentModule.id);
        }
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

        // Check if all dependencies are active before activating
        if (!this.areDependenciesActive(updatedModule)) {
            console.warn(`Cannot activate module '${moduleId}' because not all dependencies are active.`);
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

        // First deactivate all modules that depend on this module
        this.deactivateDependentModules(moduleId);
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
        if (isContextProviderModule(updatedModule)) {
            const contextProviderModules = allModules.filter(isContextProviderModule)
            this.moduleSetters.setContextProviderModules(contextProviderModules)
        }
    }
}

