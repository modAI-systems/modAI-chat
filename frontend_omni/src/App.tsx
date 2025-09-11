import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { WebModuleProvider, useWebModules } from './contexts/WebModulesContext'
import { SidebarProvider } from './components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'

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


  console.log('Render main')
  return (
    <Routes>
      {/* Full page routes (like login) without layout */}
      {fullPageModules.map((module) => (
        module.createFullPageRoute()
      ))}

      {/* All other routes with sidebar layout */}
      <Route path="/" element={<SidebarFullPage />}>
        <Route index element={<Navigate to="/chat" replace />} />
        {routingModules.map((module) => (
          module.createRoute()
        ))}
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <WebModuleProvider>
        <Router>
          <AppRoutes />
        </Router>
      </WebModuleProvider>
    </ThemeProvider>
  )
}

export default App
