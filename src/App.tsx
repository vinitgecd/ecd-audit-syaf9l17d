import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import { AuthProvider } from './hooks/use-auth'

import Login from './pages/auth/Login'
import Index from './pages/Index'
import Projects from './pages/Projects'
import Import from './pages/Import'
import Analysis from './pages/Analysis'
import Balancete from './pages/Balancete'
import Documents from './pages/Documents'
import Razao from './pages/Razao'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/import" element={<Import />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/balancete" element={<Balancete />} />
            <Route path="/balancete/:accountId/razao" element={<Razao />} />
            <Route path="/documents" element={<Documents />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
