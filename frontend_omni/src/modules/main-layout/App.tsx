import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import {
    createBrowserRouter,
    Navigate,
    Outlet,
    type RouteObject,
    RouterProvider,
} from "react-router-dom";
import { type Modules, useModules } from "@/modules/module-system";
import { ModulesProvider } from "@/modules/module-system/ModulesContext";
import { ThemeProvider } from "@/modules/theme-provider/ThemeProvider";
import { SidebarProvider } from "@/shadcn/components/ui/sidebar";
import { Toaster } from "@/shadcn/components/ui/sonner";
import { ModuleContextProvider } from "../module-context-provider/ModuleContextProvider";
import { AppSidebar } from "./AppSidebar";
import { ErrorBoundary } from "./ErrorBoundary";
import { PageLoadingScreen } from "./PageLoadingScreen";
import "@/modules/i18n/i18n";

const queryClient = new QueryClient();

export default function App() {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <Suspense fallback={<PageLoadingScreen />}>
                    <ModulesProvider>
                        <ModuleContextProvider name="GlobalContextProvider">
                            <RoutedSidebarLayout />
                        </ModuleContextProvider>
                    </ModulesProvider>
                </Suspense>
                <Toaster />
            </QueryClientProvider>
        </ThemeProvider>
    );
}

function RoutedSidebarLayout() {
    const modules = useModules();

    const routerEntries = modules
        .getAll<(modules: Modules) => RouteObject[]>("RouterEntry")
        .flatMap((fn) => fn(modules));
    const fallbackRoute = modules.getOne<(modules: Modules) => RouteObject>(
        "FallbackRouterEntry",
    );

    const routes: RouteObject[] = [
        {
            path: "/",
            element: (
                <SidebarProvider>
                    <AppSidebar />
                    <main className="min-h-screen h-screen flex-1 bg-background text-foreground">
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </main>
                </SidebarProvider>
            ),
            children: routerEntries,
        },
    ];

    if (fallbackRoute) {
        const fallback = fallbackRoute(modules);
        routes[0].children?.push({ index: true, element: fallback.element });
        routes[0].children?.push(fallback);
    } else {
        routes[0].children?.push({
            path: "*",
            element: <Navigate to="/" replace />,
        });
    }

    const router = createBrowserRouter(routes);

    return <RouterProvider router={router} />;
}
