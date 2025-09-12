import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { WebModuleProvider, useWebModules } from './contexts/WebModulesContext'
import { SidebarProvider } from './components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'

interface ModuleContextProviderProps {
  children: React.ReactNode
}

function ModuleContextProviders({ children }: ModuleContextProviderProps) {
  const { contextProviderModules } = useWebModules()

  // Wrap children with all context provider modules
  return contextProviderModules.reduce(
    (wrappedChildren, module) => module.createContextProvider(wrappedChildren),
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
  const { routingModules, fullPageModules } = useWebModules()

  return (
    <Routes>
      {/* Full page routes (like login) without layout */}
      {fullPageModules.map((module) => (
        module.createFullPageRoute()
      ))}

      {/* All other routes with sidebar layout */}
      <Route path="/" element={<SidebarFullPage />}>
        {routingModules.map((module) => (
          module.createRoute()
        ))}
      </Route>

      {/* Catch-all route for unavailable paths - redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <WebModuleProvider>
        <ModuleContextProviders>
          <Router>
            <AppRoutes />
          </Router>
        </ModuleContextProviders>
      </WebModuleProvider>
    </ThemeProvider>
  )
}

export default App
