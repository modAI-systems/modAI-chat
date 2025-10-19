import React, { Component, type ReactNode } from "react";
import { renderHook, waitFor, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useManifest } from "./moduleManifestLoader";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Error boundary component for testing
class ErrorBoundary extends Component<
    { children: ReactNode },
    { error: Error | null }
> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return <div>Error: {this.state.error.message}</div>;
        }
        return this.props.children;
    }
}

// Test component that uses the hook
const TestComponent = ({ manifestPath }: { manifestPath: string }) => {
    const manifest = useManifest(manifestPath);
    return <div>Success: {JSON.stringify(manifest)}</div>;
};

describe("useManifest", () => {
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

    afterEach(() => {
        queryClient.clear();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it("should return manifest data when fetch and JSON parse are successful", async () => {
        const mockManifest = {
            version: "1.0.0",
            modules: [
                {
                    id: "test-module",
                    name: "Test Module",
                    path: "/modules/test",
                    enabled: true,
                },
            ],
        };

        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockManifest),
        };

        fetchMock.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useManifest("/manifest.json"), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current).toEqual(mockManifest);
        });

        expect(fetchMock).toHaveBeenCalledWith("/manifest.json");
        expect(mockResponse.json).toHaveBeenCalled();
    });

    it("should throw error when fetch is successful but JSON parse fails", async () => {
        const mockResponse = {
            ok: true,
            json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        };

        fetchMock.mockResolvedValue(mockResponse);

        const { container } = render(
            <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                    <TestComponent manifestPath="/manifest.json" />
                </QueryClientProvider>
            </ErrorBoundary>
        );

        await waitFor(() => {
            expect(container.textContent).toContain("Invalid JSON");
        });

        expect(fetchMock).toHaveBeenCalledWith("/manifest.json");
        expect(mockResponse.json).toHaveBeenCalled();
    });

    it("should throw error when fetch fails", async () => {
        const mockResponse = {
            ok: false,
            statusText: "Not Found",
        };

        fetchMock.mockResolvedValue(mockResponse);

        const { container } = render(
            <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                    <TestComponent manifestPath="/manifest.json" />
                </QueryClientProvider>
            </ErrorBoundary>
        );

        await waitFor(() => {
            expect(container.textContent).toContain(
                "Failed to fetch manifest: Not Found"
            );
        });

        expect(fetchMock).toHaveBeenCalledWith("/manifest.json");
    });
});
