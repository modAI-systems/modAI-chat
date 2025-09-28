import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useModuleManagerFromManifest } from './manifestModuleManager';
import type { ModuleManifest } from './moduleManifestLoader';

// Mock the dynamic import
const mockImport = vi.fn();
vi.stubGlobal('import', mockImport);

describe('useModuleManagerFromManifest', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        vi.clearAllMocks();
    });

    it('should load dummy modules and allow retrieval via getAll', async () => {
        // Create a dummy manifest
        const dummyManifest: ModuleManifest = {
            version: '1.0.0',
            modules: [
                {
                    id: 'dummy-module',
                    name: 'Dummy Module',
                    path: '@/modules/dummy',
                    enabled: true,
                },
            ],
        };

        // Mock the import to return dummy metadata
        const dummyComponent = { name: 'TestComponent', component: () => <div>Test</div> };
        mockImport.mockResolvedValue({
            Metadata: {
                id: 'dummy-module',
                version: '1.0.0',
                description: 'Dummy module for testing',
                author: 'Test',
                dependentModules: [],
                components: [dummyComponent],
            },
        });

        // Render the hook
        const { result } = renderHook(() => useModuleManagerFromManifest(dummyManifest), {
            wrapper: ({ children }) => (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            ),
        });

        // Wait for the query to resolve
        await waitFor(() => {
            expect(result.current).toBeDefined();
        });

        // Check that getAll returns the dummy component
        const components = result.current.getAll('TestComponent');
        expect(components).toHaveLength(1);
        expect(components[0]).toBe(dummyComponent);
    });
});