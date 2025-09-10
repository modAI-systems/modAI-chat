import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { registerBuiltInModules } from './services/builtInModules'
import { moduleManager } from './services/moduleManager'
import { SidebarProvider } from './components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'

// Register built-in modules
registerBuiltInModules()


export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="min-h-screen h-screen flex-1 bg-background text-foreground">
        <Outlet />
      </main>
    </SidebarProvider>
  )
}

function App() {
  const routingModules = moduleManager.getRoutingModules()
  const fullPageModules = moduleManager.getFullPageModules()

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Full page routes (like login) without layout */}
          {fullPageModules.map((module) => (
            module.createFullPageRoute()
          ))}

          {/* All other routes with sidebar layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            {routingModules.map((module) => (
              module.createRoute()
            ))}
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
