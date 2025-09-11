import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ModuleManager } from '@/services/moduleManager'
import type { RoutingModule, FullPageModule, SidebarModule, GenericModule } from '@/types/module'

// Mock setters for testing
const mockSetters = {
    setAllModules: vi.fn(),
    setRoutingModules: vi.fn(),
    setFullPageModules: vi.fn(),
    setSidebarModules: vi.fn(),
    setGenericModules: vi.fn(),
}

// Mock modules for testing
const mockGenericModule: GenericModule = {
    id: 'generic-module',
    version: '1.0.0',
    description: 'A generic module',
    install: vi.fn()
}

const mockRoutingModule: RoutingModule = {
    id: 'routing-module',
    version: '1.0.0',
    description: 'A routing module',
    createRoute: vi.fn()
}

const mockFullPageModule: FullPageModule = {
    id: 'fullpage-module',
    version: '1.0.0',
    description: 'A fullpage module',
    createFullPageRoute: vi.fn()
}

const mockSidebarModule: SidebarModule = {
    id: 'sidebar-module',
    version: '1.0.0',
    description: 'A sidebar module',
    createSidebarItem: vi.fn(),
    createSidebarFooterItem: vi.fn()
}

describe('ModuleManager', () => {
    let moduleManager: ModuleManager

    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks()
        moduleManager = new ModuleManager(mockSetters)
    })

    describe('module registration', () => {
        it('should register a module', () => {
            moduleManager.registerModule(mockGenericModule)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(1)
            expect(allModules[0]).toBe(mockGenericModule)
        })

        it('should register multiple modules', () => {
            moduleManager.registerModule(mockGenericModule)
            moduleManager.registerModule(mockRoutingModule)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(2)
            expect(allModules).toContain(mockGenericModule)
            expect(allModules).toContain(mockRoutingModule)
        })

        it('should replace module with same id when registering', () => {
            const updatedGenericModule: GenericModule = {
                ...mockGenericModule,
                version: '2.0.0'
            }

            moduleManager.registerModule(mockGenericModule)
            moduleManager.registerModule(updatedGenericModule)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(1)
            expect(allModules[0].version).toBe('2.0.0')
        })
    })

    describe('module unregistration', () => {
        it('should unregister a module', () => {
            moduleManager.registerModule(mockGenericModule)
            moduleManager.activateModule(mockGenericModule.id)

            moduleManager.unregisterModule(mockGenericModule.id)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(0)
        })

        it('should handle unregistering non-existent module', () => {
            expect(() => {
                moduleManager.unregisterModule('non-existent-id')
            }).not.toThrow()
        })
    })

    describe('module activation', () => {
        it('should activate a registered generic module', () => {
            moduleManager.registerModule(mockGenericModule)
            moduleManager.activateModule(mockGenericModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockGenericModule])
            expect(mockSetters.setGenericModules).toHaveBeenCalledWith([mockGenericModule])
        })

        it('should activate a registered routing module', () => {
            moduleManager.registerModule(mockRoutingModule)
            moduleManager.activateModule(mockRoutingModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockRoutingModule])
            expect(mockSetters.setRoutingModules).toHaveBeenCalledWith([mockRoutingModule])
        })

        it('should activate a registered fullpage module', () => {
            moduleManager.registerModule(mockFullPageModule)
            moduleManager.activateModule(mockFullPageModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockFullPageModule])
            expect(mockSetters.setFullPageModules).toHaveBeenCalledWith([mockFullPageModule])
        })

        it('should activate a registered sidebar module', () => {
            moduleManager.registerModule(mockSidebarModule)
            moduleManager.activateModule(mockSidebarModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockSidebarModule])
            expect(mockSetters.setSidebarModules).toHaveBeenCalledWith([mockSidebarModule])
        })

        it('should handle activating non-existent module', () => {
            moduleManager.activateModule('non-existent-id')

            expect(mockSetters.setAllModules).not.toHaveBeenCalled()
        })

        it('should activate multiple modules of different types', () => {
            moduleManager.registerModule(mockGenericModule)
            moduleManager.registerModule(mockRoutingModule)

            moduleManager.activateModule(mockGenericModule.id)
            moduleManager.activateModule(mockRoutingModule.id)

            // Should be called twice - once for each activation
            expect(mockSetters.setAllModules).toHaveBeenCalledTimes(2)
            expect(mockSetters.setAllModules).toHaveBeenLastCalledWith([mockGenericModule, mockRoutingModule])
        })
    })

    describe('module deactivation', () => {
        it('should deactivate an active module', () => {
            moduleManager.registerModule(mockGenericModule)
            moduleManager.activateModule(mockGenericModule.id)

            // Clear previous calls
            vi.clearAllMocks()

            moduleManager.deactivateModule(mockGenericModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([])
            expect(mockSetters.setGenericModules).toHaveBeenCalledWith([])
        })

        it('should handle deactivating non-existent module', () => {
            moduleManager.deactivateModule('non-existent-id')

            expect(mockSetters.setAllModules).not.toHaveBeenCalled()
        })

        it('should maintain other active modules when deactivating one', () => {
            moduleManager.registerModule(mockGenericModule)
            moduleManager.registerModule(mockRoutingModule)

            moduleManager.activateModule(mockGenericModule.id)
            moduleManager.activateModule(mockRoutingModule.id)

            // Clear previous calls
            vi.clearAllMocks()

            moduleManager.deactivateModule(mockGenericModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockRoutingModule])
            // Only the deactivated module type setter is called (genericModules in this case)
            expect(mockSetters.setGenericModules).toHaveBeenCalledWith([])
            // Routing modules setter is not called since the updated module is not a routing module
            expect(mockSetters.setRoutingModules).not.toHaveBeenCalled()
        })
    })

    describe('getAllModules', () => {
        it('should return empty array when no modules registered', () => {
            const allModules = moduleManager.getAllModules()
            expect(allModules).toEqual([])
        })

        it('should return all registered modules regardless of activation status', () => {
            moduleManager.registerModule(mockGenericModule)
            moduleManager.registerModule(mockRoutingModule)

            // Only activate one
            moduleManager.activateModule(mockGenericModule.id)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(2)
            expect(allModules).toContain(mockGenericModule)
            expect(allModules).toContain(mockRoutingModule)
        })
    })
})
