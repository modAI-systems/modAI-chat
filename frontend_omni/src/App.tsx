import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { SidebarProvider } from './components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'
import { ModuleManagerProvider, useModules } from './contexts/ModuleManagerContext'

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

export function SidebarFullPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="min-h-screen h-screen flex-1 bg-background text-foreground">
        <Outlet />
      </main>
    </SidebarProvider>
  )
}

function AppRoutes() {
  const modules = useModules()
  const fullPageRouteFunctions = modules.getComponentsByName("FullPageRoute")
  const sidebarPageRouteFunctions = modules.getComponentsByName("SidebarPageRoute")

  return <Routes>

    {fullPageRouteFunctions.map((createRoute) => (
      // Unfortunately I cannot treat this like a component because
      // if I would, the Router complains that it is not of type "Route"
      // therefor for routes I have to call the function here directly
      // PLEASE: If you know a better way, let me know!
      createRoute()
    ))}

    {/* All other routes with sidebar layout */}
    <Route path="/" element={<SidebarFullPage />}>
      {sidebarPageRouteFunctions.map((createRoute) => (
        createRoute()
      ))}
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function App() {
  return (
    <ThemeProvider>
      <ModuleManagerProvider>
        <ModuleContextProviders>
          <Router>
            <AppRoutes />
          </Router>
        </ModuleContextProviders>
      </ModuleManagerProvider>
    </ThemeProvider>
  )
}

export default App
