import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ModuleManager } from '@/services/moduleManager'
import type { RoutingModule, FullPageModule, SidebarModule, WebModule, ContextProviderModule } from '@/types/module'

// Mock setters for testing
const mockSetters = {
    setAllModules: vi.fn(),
    setRoutingModules: vi.fn(),
    setFullPageModules: vi.fn(),
    setSidebarModules: vi.fn(),
    setContextProviderModules: vi.fn(),
}

// Mock modules for testing
const mockWebModule: WebModule = {
    id: 'generic-module',
    version: '1.0.0',
    description: 'A generic module',
    dependentModules: [],
    install: vi.fn()
}

const mockRoutingModule: RoutingModule = {
    id: 'routing-module',
    version: '1.0.0',
    description: 'A routing module',
    dependentModules: [],
    install: vi.fn(),
    createRoute: vi.fn()
}

const mockFullPageModule: FullPageModule = {
    id: 'fullpage-module',
    version: '1.0.0',
    description: 'A fullpage module',
    dependentModules: [],
    install: vi.fn(),
    createFullPageRoute: vi.fn()
}

const mockSidebarModule: SidebarModule = {
    id: 'sidebar-module',
    version: '1.0.0',
    description: 'A sidebar module',
    dependentModules: [],
    install: vi.fn(),
    createSidebarItem: vi.fn(),
    createSidebarFooterItem: vi.fn()
}

const mockContextProviderModule: ContextProviderModule = {
    id: 'context-provider-module',
    version: '1.0.0',
    description: 'A context provider module',
    dependentModules: [],
    install: vi.fn(),
    createContextProvider: vi.fn()
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
            moduleManager.registerModule(mockWebModule)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(1)
            expect(allModules[0]).toBe(mockWebModule)
        })

        it('should register multiple modules', () => {
            moduleManager.registerModule(mockWebModule)
            moduleManager.registerModule(mockRoutingModule)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(2)
            expect(allModules).toContain(mockWebModule)
            expect(allModules).toContain(mockRoutingModule)
        })

        it('should replace module with same id when registering', () => {
            const updatedWebModule: WebModule = {
                ...mockWebModule,
                version: '2.0.0'
            }

            moduleManager.registerModule(mockWebModule)
            moduleManager.registerModule(updatedWebModule)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(1)
            expect(allModules[0].version).toBe('2.0.0')
        })
    })

    describe('module unregistration', () => {
        it('should unregister a module', () => {
            moduleManager.registerModule(mockWebModule)
            moduleManager.activateModule(mockWebModule.id)

            moduleManager.unregisterModule(mockWebModule.id)

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
            moduleManager.registerModule(mockWebModule)
            moduleManager.activateModule(mockWebModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockWebModule])
            // No specific setter called for generic WebModule since we removed that concept
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

        it('should activate a registered context provider module', () => {
            moduleManager.registerModule(mockContextProviderModule)
            moduleManager.activateModule(mockContextProviderModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockContextProviderModule])
            expect(mockSetters.setContextProviderModules).toHaveBeenCalledWith([mockContextProviderModule])
        })

        it('should handle activating non-existent module', () => {
            moduleManager.activateModule('non-existent-id')

            expect(mockSetters.setAllModules).not.toHaveBeenCalled()
        })

        it('should activate multiple modules of different types', () => {
            moduleManager.registerModule(mockWebModule)
            moduleManager.registerModule(mockRoutingModule)

            moduleManager.activateModule(mockWebModule.id)
            moduleManager.activateModule(mockRoutingModule.id)

            // Should be called twice - once for each activation
            expect(mockSetters.setAllModules).toHaveBeenCalledTimes(2)
            expect(mockSetters.setAllModules).toHaveBeenLastCalledWith([mockWebModule, mockRoutingModule])
        })
    })

    describe('module deactivation', () => {
        it('should deactivate an active module', () => {
            moduleManager.registerModule(mockWebModule)
            moduleManager.activateModule(mockWebModule.id)

            // Clear previous calls
            vi.clearAllMocks()

            moduleManager.deactivateModule(mockWebModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([])
            // No specific setter called for generic WebModule since we removed that concept
        })

        it('should handle deactivating non-existent module', () => {
            moduleManager.deactivateModule('non-existent-id')

            expect(mockSetters.setAllModules).not.toHaveBeenCalled()
        })

        it('should maintain other active modules when deactivating one', () => {
            moduleManager.registerModule(mockWebModule)
            moduleManager.registerModule(mockRoutingModule)

            moduleManager.activateModule(mockWebModule.id)
            moduleManager.activateModule(mockRoutingModule.id)

            // Clear previous calls
            vi.clearAllMocks()

            moduleManager.deactivateModule(mockWebModule.id)

            expect(mockSetters.setAllModules).toHaveBeenCalledWith([mockRoutingModule])
            // No specific setters called for generic WebModule since we removed that concept
            // Routing modules setter is not called since the deactivated module is not a routing module
            expect(mockSetters.setRoutingModules).not.toHaveBeenCalled()
        })
    })

    describe('getAllModules', () => {
        it('should return empty array when no modules registered', () => {
            const allModules = moduleManager.getAllModules()
            expect(allModules).toEqual([])
        })

        it('should return all registered modules regardless of activation status', () => {
            moduleManager.registerModule(mockWebModule)
            moduleManager.registerModule(mockRoutingModule)

            // Only activate one
            moduleManager.activateModule(mockWebModule.id)

            const allModules = moduleManager.getAllModules()
            expect(allModules).toHaveLength(2)
            expect(allModules).toContain(mockWebModule)
            expect(allModules).toContain(mockRoutingModule)
        })
    })

    describe('dependency management', () => {
        describe('activation with dependencies', () => {
            it('should activate module when all dependencies are active', () => {
                const dependencyModule: WebModule = {
                    id: 'dependency-module',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const dependentModule: WebModule = {
                    id: 'dependent-module',
                    version: '1.0.0',
                    dependentModules: ['dependency-module'],
                    install: vi.fn()
                }

                moduleManager.registerModule(dependencyModule)
                moduleManager.registerModule(dependentModule)

                // Activate dependency first
                moduleManager.activateModule(dependencyModule.id)
                vi.clearAllMocks()

                // Now activate dependent module
                moduleManager.activateModule(dependentModule.id)

                expect(mockSetters.setAllModules).toHaveBeenCalledWith([dependencyModule, dependentModule])
            })

            it('should not activate module when dependencies are not active', () => {
                const dependencyModule: WebModule = {
                    id: 'dependency-module',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const dependentModule: WebModule = {
                    id: 'dependent-module',
                    version: '1.0.0',
                    dependentModules: ['dependency-module'],
                    install: vi.fn()
                }

                moduleManager.registerModule(dependencyModule)
                moduleManager.registerModule(dependentModule)

                // Try to activate dependent module without activating dependency
                moduleManager.activateModule(dependentModule.id)

                expect(mockSetters.setAllModules).not.toHaveBeenCalled()
            })

            it('should not activate module when some dependencies are missing', () => {
                const dependentModule: WebModule = {
                    id: 'dependent-module',
                    version: '1.0.0',
                    dependentModules: ['non-existent-dependency'],
                    install: vi.fn()
                }

                moduleManager.registerModule(dependentModule)

                // Try to activate module with missing dependency
                moduleManager.activateModule(dependentModule.id)

                expect(mockSetters.setAllModules).not.toHaveBeenCalled()
            })

            it('should handle multiple dependencies correctly', () => {
                const dependency1: WebModule = {
                    id: 'dependency-1',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const dependency2: WebModule = {
                    id: 'dependency-2',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const dependentModule: WebModule = {
                    id: 'dependent-module',
                    version: '1.0.0',
                    dependentModules: ['dependency-1', 'dependency-2'],
                    install: vi.fn()
                }

                moduleManager.registerModule(dependency1)
                moduleManager.registerModule(dependency2)
                moduleManager.registerModule(dependentModule)

                // Activate only one dependency
                moduleManager.activateModule(dependency1.id)
                moduleManager.activateModule(dependentModule.id)

                // Should not activate dependent module
                expect(mockSetters.setAllModules).toHaveBeenCalledTimes(1)
                expect(mockSetters.setAllModules).toHaveBeenCalledWith([dependency1])

                // Activate second dependency
                moduleManager.activateModule(dependency2.id)
                moduleManager.activateModule(dependentModule.id)

                // Now should activate dependent module
                expect(mockSetters.setAllModules).toHaveBeenCalledWith([dependency1, dependency2, dependentModule])
            })
        })

        describe('deactivation with dependents', () => {
            it('should deactivate dependent modules when deactivating a dependency', () => {
                const dependencyModule: WebModule = {
                    id: 'dependency-module',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const dependentModule: WebModule = {
                    id: 'dependent-module',
                    version: '1.0.0',
                    dependentModules: ['dependency-module'],
                    install: vi.fn()
                }

                moduleManager.registerModule(dependencyModule)
                moduleManager.registerModule(dependentModule)

                // Activate both modules
                moduleManager.activateModule(dependencyModule.id)
                moduleManager.activateModule(dependentModule.id)

                vi.clearAllMocks()

                // Deactivate dependency - should also deactivate dependent
                moduleManager.deactivateModule(dependencyModule.id)

                expect(mockSetters.setAllModules).toHaveBeenCalledWith([])
            })

            it('should handle cascade deactivation with multiple levels', () => {
                const baseModule: WebModule = {
                    id: 'base-module',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const middleModule: WebModule = {
                    id: 'middle-module',
                    version: '1.0.0',
                    dependentModules: ['base-module'],
                    install: vi.fn()
                }

                const topModule: WebModule = {
                    id: 'top-module',
                    version: '1.0.0',
                    dependentModules: ['middle-module'],
                    install: vi.fn()
                }

                moduleManager.registerModule(baseModule)
                moduleManager.registerModule(middleModule)
                moduleManager.registerModule(topModule)

                // Activate all modules in order
                moduleManager.activateModule(baseModule.id)
                moduleManager.activateModule(middleModule.id)
                moduleManager.activateModule(topModule.id)

                vi.clearAllMocks()

                // Deactivate base module - should cascade deactivate all
                moduleManager.deactivateModule(baseModule.id)

                expect(mockSetters.setAllModules).toHaveBeenCalledWith([])
            })

            it('should handle multiple dependents correctly', () => {
                const dependencyModule: WebModule = {
                    id: 'dependency-module',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const dependent1: WebModule = {
                    id: 'dependent-1',
                    version: '1.0.0',
                    dependentModules: ['dependency-module'],
                    install: vi.fn()
                }

                const dependent2: WebModule = {
                    id: 'dependent-2',
                    version: '1.0.0',
                    dependentModules: ['dependency-module'],
                    install: vi.fn()
                }

                const independentModule: WebModule = {
                    id: 'independent-module',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                moduleManager.registerModule(dependencyModule)
                moduleManager.registerModule(dependent1)
                moduleManager.registerModule(dependent2)
                moduleManager.registerModule(independentModule)

                // Activate all modules
                moduleManager.activateModule(dependencyModule.id)
                moduleManager.activateModule(dependent1.id)
                moduleManager.activateModule(dependent2.id)
                moduleManager.activateModule(independentModule.id)

                vi.clearAllMocks()

                // Deactivate dependency - should deactivate both dependents but keep independent
                moduleManager.deactivateModule(dependencyModule.id)

                expect(mockSetters.setAllModules).toHaveBeenCalledWith([independentModule])
            })

            it('should not affect independent modules when deactivating', () => {
                const module1: WebModule = {
                    id: 'module-1',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const module2: WebModule = {
                    id: 'module-2',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                moduleManager.registerModule(module1)
                moduleManager.registerModule(module2)

                moduleManager.activateModule(module1.id)
                moduleManager.activateModule(module2.id)

                vi.clearAllMocks()

                // Deactivate one module - should not affect the other
                moduleManager.deactivateModule(module1.id)

                expect(mockSetters.setAllModules).toHaveBeenCalledWith([module2])
            })
        })

        describe('complex dependency scenarios', () => {
            it('should handle diamond dependency pattern', () => {
                const baseModule: WebModule = {
                    id: 'base',
                    version: '1.0.0',
                    dependentModules: [],
                    install: vi.fn()
                }

                const left: WebModule = {
                    id: 'left',
                    version: '1.0.0',
                    dependentModules: ['base'],
                    install: vi.fn()
                }

                const right: WebModule = {
                    id: 'right',
                    version: '1.0.0',
                    dependentModules: ['base'],
                    install: vi.fn()
                }

                const top: WebModule = {
                    id: 'top',
                    version: '1.0.0',
                    dependentModules: ['left', 'right'],
                    install: vi.fn()
                }

                moduleManager.registerModule(baseModule)
                moduleManager.registerModule(left)
                moduleManager.registerModule(right)
                moduleManager.registerModule(top)

                // Activate base, left, right
                moduleManager.activateModule(baseModule.id)
                moduleManager.activateModule(left.id)
                moduleManager.activateModule(right.id)

                vi.clearAllMocks()

                // Should be able to activate top now
                moduleManager.activateModule(top.id)

                expect(mockSetters.setAllModules).toHaveBeenCalledWith([baseModule, left, right, top])
            })

            it('should prevent activation when circular dependencies exist', () => {
                const module1: WebModule = {
                    id: 'module-1',
                    version: '1.0.0',
                    dependentModules: ['module-2'],
                    install: vi.fn()
                }

                const module2: WebModule = {
                    id: 'module-2',
                    version: '1.0.0',
                    dependentModules: ['module-1'],
                    install: vi.fn()
                }

                moduleManager.registerModule(module1)
                moduleManager.registerModule(module2)

                // Neither should be able to activate due to circular dependency
                moduleManager.activateModule(module1.id)
                moduleManager.activateModule(module2.id)

                expect(mockSetters.setAllModules).not.toHaveBeenCalled()
            })
        })
    })
})
