import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import { AuthProvider } from './hooks/use-auth'
import { AccountingProvider } from './stores/useAccountingStore'
import { DatabaseProvider } from './contexts/DatabaseContext'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Index from './pages/Index'
import Projects from './pages/Projects'
import Import from './pages/Import'
import Analysis from './pages/Analysis'
import Balancete from './pages/Balancete'
import Documents from './pages/Documents'
import Razao from './pages/Razao'
import Pending from './pages/Pending'
import ProjectSettings from './pages/ProjectSettings'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <DatabaseProvider>
      <AuthProvider>
        <AccountingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Index />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId/import" element={<Import />} />
                <Route path="/projects/:projectId/analysis" element={<Analysis />} />
                <Route path="/projects/:projectId/balancete" element={<Balancete />} />
                <Route path="/projects/:projectId/razao/:accountId" element={<Razao />} />
                <Route path="/projects/:projectId/documents" element={<Documents />} />
                <Route path="/projects/:projectId/pending" element={<Pending />} />
                <Route path="/projects/:projectId/settings" element={<ProjectSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AccountingProvider>
      </AuthProvider>
    </DatabaseProvider>
  </BrowserRouter>
)

export default App
