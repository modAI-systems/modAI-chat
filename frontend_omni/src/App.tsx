import { Routes, Route, Navigate } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { SidebarProvider } from './components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'
import { registerBuiltInModules } from './services/builtInModules'
import { moduleManager } from './services/moduleManager'

// Register built-in modules
registerBuiltInModules()


function AppRoutes() {
  const modules = moduleManager.getModules()

  // TODO make the "/" redirect path configurable
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      {modules.map((module) => (
        module.createRoute()
      ))}
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <SidebarProvider>
          <AppSidebar />
          <main className="min-h-screen h-screen flex-1 bg-background text-foreground">
            <AppRoutes />
          </main>
        </SidebarProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App
