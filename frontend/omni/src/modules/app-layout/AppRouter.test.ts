import type { Component } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleDependencies } from "@/core/module-system";

const { createRouterMock } = vi.hoisted(() => ({
    createRouterMock: vi.fn(),
}));

vi.mock("sv-router", () => ({
    createRouter: createRouterMock,
    Router: () => null,
}));

import { create } from "./AppRouter.svelte";
import type { RouteDefinition } from "./routeDefinition.svelte";

describe("AppRouter create", () => {
    beforeEach(() => {
        createRouterMock.mockReset();
    });

    it("uses route map fallback and does not force a root redirect", () => {
        const homeComponent = {} as Component;
        const fallbackComponent = {} as Component;
        const layout = {} as Component;

        const routes: RouteDefinition[] = [
            { path: "/", component: homeComponent },
            { path: "/providers", component: {} as Component },
        ];
        const fallbackRoute: RouteDefinition = {
            path: "/notfound",
            component: fallbackComponent,
        };

        const navigate = vi.fn();
        const routerService = { navigate };
        createRouterMock.mockReturnValue(routerService);

        const deps: ModuleDependencies = {
            getAll: vi.fn((name: string) => {
                if (name === "routes") {
                    return routes;
                }

                throw new Error(`Unexpected getAll dependency: ${name}`);
            }),
            getOne: vi.fn((name: string) => {
                if (name === "fallbackRoute") {
                    return fallbackRoute;
                }

                if (name === "layout") {
                    return layout;
                }

                throw new Error(`Unexpected getOne dependency: ${name}`);
            }),
        };

        const result = create(deps);

        expect(createRouterMock).toHaveBeenCalledWith({
            layout,
            "/": homeComponent,
            "/providers": routes[1].component,
            "*": fallbackComponent,
        });
        expect(result).toBe(routerService);
        expect(result.getRoutes()).toBe(routes);
        expect(navigate).not.toHaveBeenCalled();
    });
});
