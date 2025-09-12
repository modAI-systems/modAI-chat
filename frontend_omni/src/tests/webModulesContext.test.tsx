import { describe, it, expect, vi } from 'vitest'

// Mock the manifestLoader
vi.mock('../services/manifestLoader', () => ({
    manifestLoader: {
        loadModulesFromManifest: vi.fn()
    }
}))

describe('WebModulesContext', () => {
    it('should export WebModuleProvider and useWebModules', async () => {
        const contextModule = await import('../contexts/WebModulesContext')

        expect(contextModule.WebModuleProvider).toBeDefined()
        expect(contextModule.useWebModules).toBeDefined()
        expect(typeof contextModule.WebModuleProvider).toBe('function')
        expect(typeof contextModule.useWebModules).toBe('function')
    })

    it('should create ModuleManager instance', async () => {
        const { ModuleManager } = await import('../services/moduleManager')

        const mockSetters = {
            setAllModules: vi.fn(),
            setRoutingModules: vi.fn(),
            setFullPageModules: vi.fn(),
            setSidebarModules: vi.fn(),
            setContextProviderModules: vi.fn(),
        }

        const manager = new ModuleManager(mockSetters)
        expect(manager).toBeDefined()
        expect(typeof manager.loadFromManifest).toBe('function')
        expect(typeof manager.registerModule).toBe('function')
        expect(typeof manager.activateModule).toBe('function')
    })
})
