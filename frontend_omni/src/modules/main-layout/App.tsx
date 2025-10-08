import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { ThemeProvider } from "@/modules/theme-provider/ThemeProvider";
import { SidebarProvider } from "@/shadcn/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useModules } from "@/modules/module-system";
import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageLoadingScreen } from "./PageLoadingScreen";
import { ErrorBoundary } from "./ErrorBoundary";
import { ModuleContextProvider } from "../module-context-provider/ModuleContextProvider";
import { MAIN_ROUTER_ENTRY_MODULE_CLASS_NAME } from "@/modules/main-layout";
import { ModuleManagerProvider } from "../module-system/ModuleManagerContext";

const queryClient = new QueryClient();

function RoutedSidebarLayout() {
    const modules = useModules();
    const routerEntryComponents = modules.getAll<() => React.JSX.Element>(
        MAIN_ROUTER_ENTRY_MODULE_CLASS_NAME
    );

    return (
        <Router>
            <SidebarProvider>
                <AppSidebar />
                <main className="min-h-screen h-screen flex-1 bg-background text-foreground">
                    <ErrorBoundary>
                        <Routes>
                            {routerEntryComponents.map((createRoute) =>
                                // Usually elements of the `modules.getAll(...)` are react components
                                // and should be used as <Component />. However, this doesn't work her for the router
                                // because it needs to return a <Route> element. Therefore we call the function directly.
                                createRoute()
                            )}
                            <Route
                                path="*"
                                element={<Navigate to="/" replace />}
                            />
                        </Routes>
                    </ErrorBoundary>
                </main>
            </SidebarProvider>
        </Router>
    );
}

function App() {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <Suspense fallback={<PageLoadingScreen />}>
                    <ModuleManagerProvider>
                        <ModuleContextProvider name="GlobalContextProvider">
                            <RoutedSidebarLayout />
                        </ModuleContextProvider>
                    </ModuleManagerProvider>
                </Suspense>
            </QueryClientProvider>
        </ThemeProvider>
    );
}

export default App;
