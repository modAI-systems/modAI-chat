import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ManifestLoader, type ModuleManifest } from '../services/manifestLoader'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ManifestLoader', () => {
    let manifestLoader: ManifestLoader

    beforeEach(() => {
        manifestLoader = new ManifestLoader()
        vi.clearAllMocks()
    })

    afterEach(() => {
        manifestLoader.clearCache()
    })

    describe('loadManifest', () => {
        it('should fetch and parse manifest.json successfully', async () => {
            const mockManifest: ModuleManifest = {
                version: '1.0.0',
                modules: [
                    {
                        id: 'test-module',
                        name: 'Test Module',
                        path: '/src/modules/test/Module.tsx',
                        enabled: true,
                    }
                ]
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            })

            const result = await manifestLoader.loadManifest()

            expect(mockFetch).toHaveBeenCalledWith('/modules/manifest.json')
            expect(result).toEqual(mockManifest)
        })

        it('should cache the manifest after first load', async () => {
            const mockManifest: ModuleManifest = {
                version: '1.0.0',
                modules: []
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            })

            // First call
            await manifestLoader.loadManifest()

            // Second call - should use cache
            const result = await manifestLoader.loadManifest()

            expect(mockFetch).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockManifest)
        })

        it('should throw error when fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            })

            await expect(manifestLoader.loadManifest()).rejects.toThrow('Failed to load module manifest')
        })

        it('should throw error when network fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'))

            await expect(manifestLoader.loadManifest()).rejects.toThrow('Failed to load module manifest')
        })
    })

    describe('clearCache', () => {
        it('should clear the manifest cache', async () => {
            const mockManifest: ModuleManifest = {
                version: '1.0.0',
                modules: []
            }

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            })

            // Load manifest to cache it
            await manifestLoader.loadManifest()

            // Clear cache
            manifestLoader.clearCache()

            // Load again - should fetch again
            await manifestLoader.loadManifest()

            expect(mockFetch).toHaveBeenCalledTimes(2)
        })
    })
})
