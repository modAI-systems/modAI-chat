import { type FullPageModule, type RoutingModule, type SidebarModule, type WebModule, type ContextProviderModule } from '../types/module'
import { manifestLoader } from './manifestLoader'
import type { ModuleManifest, ModuleManifestEntry } from './manifestLoader'

interface ModuleSetters {
    setAllModules: (modules: WebModule[]) => void
    setRoutingModules: (modules: RoutingModule[]) => void
    setFullPageModules: (modules: FullPageModule[]) => void
    setSidebarModules: (modules: SidebarModule[]) => void
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
     * Load modules from manifest entry
     */
    async loadModulesFromManifest(manifest: ModuleManifest): Promise<{ module: WebModule }[]> {
        const loadedModules: { module: WebModule }[] = []

        for (const manifestEntry of manifest.modules) {
            if (!manifestEntry.enabled) {
                continue
            }

            try {
                const module = await this.loadModule(manifestEntry)
                if (module) {
                    loadedModules.push({ module })
                }
            } catch (error) {
                console.error(`Failed to load module ${manifestEntry.id}:`, error)
            }
        }

        return loadedModules
    }

    private async loadModule(manifestEntry: ModuleManifestEntry): Promise<WebModule | null> {
        try {
            const moduleExports = await this.importModule(manifestEntry.path)

            if (!moduleExports || typeof moduleExports.createModule !== 'function') {
                console.warn(`Module ${manifestEntry.id} does not export a createModule function`)
                return null
            }

            const module = moduleExports.createModule()

            if (!module || typeof module !== 'object' || !module.id) {
                console.warn(`Module ${manifestEntry.id} createModule() did not return a valid module`)
                return null
            }

            return module
        } catch (error) {
            throw new Error(`Failed to load module ${manifestEntry.id}: ${error}`)
        }
    }

    private async importModule(path: string): Promise<{ createModule?: () => WebModule }> {
        try {
            return await import(/* @vite-ignore */ path)
        } catch (error) {
            throw new Error(`Failed to import module from ${path}: ${error}`)
        }
    }

    /**
     * Load modules from manifest and register/activate them
     */
    async loadFromManifest(): Promise<void> {
        try {
            const manifest = await manifestLoader.loadManifest()
            const moduleData = await this.loadModulesFromManifest(manifest)

            // First register all modules
            moduleData.forEach(({ module }) => {
                this.registerModule(module)
            })

            // Activate all modules
            moduleData.forEach(({ module }) => {
                this.activateModule(module.id)
            })

            // Always update state after loading to ensure UI reflects current state
            this.updateSettersForAllModule()
        } catch (error) {
            console.error('Failed to load modules from manifest:', error)
            throw error
        }
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
        this.updateSettersForSingleModule(updatedModule)
    }

    deactivateModule(moduleId: string): void {
        const updatedModule = this.registeredModulesById.get(moduleId);
        if (!updatedModule) {
            return;
        }

        // First deactivate all modules that depend on this module
        this.deactivateDependentModules(moduleId);
        this.activeModulesById.delete(moduleId)

        // Only call the specific type setter for the deactivated module
        this.updateSettersForSingleModule(updatedModule)
    }

    /**
     * Update all module setters with current state
     */
    private updateSettersForAllModule(): void {
        const allModules = [...this.activeModulesById.values()]
        this.moduleSetters.setAllModules(allModules)

        const routingModules = allModules.filter(isRoutingModule)
        this.moduleSetters.setRoutingModules(routingModules)

        const fullPageModules = allModules.filter(isFullPageModule)
        this.moduleSetters.setFullPageModules(fullPageModules)

        const sidebarModules = allModules.filter(isSidebarModule)
        this.moduleSetters.setSidebarModules(sidebarModules)

        const contextProviderModules = allModules.filter(isContextProviderModule)
        this.moduleSetters.setContextProviderModules(contextProviderModules)
    }

    /**
     * Update specific type setter for a module when activated
     */
    private updateSettersForSingleModule(module: WebModule): void {
        const allModules = [...this.activeModulesById.values()]
        this.moduleSetters.setAllModules(allModules)

        if (isRoutingModule(module)) {
            const routingModules = allModules.filter(isRoutingModule)
            this.moduleSetters.setRoutingModules(routingModules)
        } else if (isFullPageModule(module)) {
            const fullPageModules = allModules.filter(isFullPageModule)
            this.moduleSetters.setFullPageModules(fullPageModules)
        } else if (isSidebarModule(module)) {
            const sidebarModules = allModules.filter(isSidebarModule)
            this.moduleSetters.setSidebarModules(sidebarModules)
        } else if (isContextProviderModule(module)) {
            const contextProviderModules = allModules.filter(isContextProviderModule)
            this.moduleSetters.setContextProviderModules(contextProviderModules)
        }
    }
}

