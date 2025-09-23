import { Routes } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './modules/theme/ThemeProvider'
import { SidebarProvider } from '@/shadcn/components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'
import { useModules } from '@/moduleif/moduleSystem'
import { ModuleContextProviders, ModuleManagerProvider } from './modules/module-system/ModuleManagerContext'
import { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLoadingScreen } from './components/PageLoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'


const queryClient = new QueryClient();

function RoutedSidebarLayout() {
  const modules = useModules()
  const routerEntryFunctions = modules.getComponentsByName("RouterEntry")

  return <Router>
    <SidebarProvider>
      <AppSidebar />
      <main className="min-h-screen h-screen flex-1 bg-background text-foreground">
        <ErrorBoundary>
          <Routes>
            {routerEntryFunctions.map((createRoute) => (
              // Usually elements of the `modules.getComponentsByName(...)` are react components
              // and should be used as <Component />. However, this doesn't work her for the router
              // because it needs to return a <Route> element. Therefore we call the function directly.
              (createRoute as Function)()
            ))}
          </Routes>
        </ErrorBoundary>
      </main>
    </SidebarProvider>
  </Router>
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<PageLoadingScreen />}>
          <ModuleManagerProvider>
            <ModuleContextProviders name="GlobalContextProvider">
              <RoutedSidebarLayout />
            </ModuleContextProviders>
          </ModuleManagerProvider>
        </Suspense>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
