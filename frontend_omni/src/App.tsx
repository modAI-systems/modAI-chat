import { Routes } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './modules/theme/ThemeProvider'
import { SidebarProvider } from '@/shadcn/components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'
import { useModules } from '@/moduleif/moduleSystem'
import { ModuleManagerProvider } from './modules/module-system/ModuleManagerContext'
import { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLoadingScreen } from './components/PageLoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'


const queryClient = new QueryClient();

interface ModuleContextProviderProps {
  children: React.ReactNode
}

function ModuleContextProviders({ children }: ModuleContextProviderProps) {
  const modules = useModules()

  const contextProviders = modules.getComponentsByName("ContextProvider")

  // Wrap children with all context provider modules
  return contextProviders.reduce(
    (wrappedChildren, Component) => <Component>{wrappedChildren}</Component>,
    children
  )
}

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
              createRoute()
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
            <ModuleContextProviders>
              <RoutedSidebarLayout />
            </ModuleContextProviders>
          </ModuleManagerProvider>
        </Suspense>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
