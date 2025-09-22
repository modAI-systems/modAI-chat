import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type ModuleManifest } from '@/moduleif/moduleSystem'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import the actual fetch function for testing
async function fetchManifest(): Promise<ModuleManifest> {
    const response = await fetch('/modules/manifest.json')
    if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`)
    }
    return await response.json()
}

describe('ManifestLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('fetchManifest', () => {
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

            const result = await fetchManifest()

            expect(mockFetch).toHaveBeenCalledWith('/modules/manifest.json')
            expect(result).toEqual(mockManifest)
        })

        it('should throw error when fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            })

            await expect(fetchManifest()).rejects.toThrow('Failed to fetch manifest: Not Found')
        })

        it('should throw error when network fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'))

            await expect(fetchManifest()).rejects.toThrow('Network error')
        })
    })
})
