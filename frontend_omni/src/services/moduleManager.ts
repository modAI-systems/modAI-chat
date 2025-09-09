import type { GenericModule } from '../types/module'

class ModuleManager {
    private modules: GenericModule[] = []

    getModules(): GenericModule[] {
        return [...this.modules]
    }

    registerModule(module: GenericModule): void {
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
