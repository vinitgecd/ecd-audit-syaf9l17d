import { useEffect, useState, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Folder, Plus, FileText, CheckCircle2 } from 'lucide-react'
import { getProjects, Project } from '@/services/projects'
import { useRealtime } from '@/hooks/use-realtime'

export default function Index() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    if (!user) return
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useRealtime(
    'projects',
    () => {
      fetchProjects()
    },
    !!user,
  )

  if (!user) return <Navigate to="/login" replace />

  const activeProjects = projects.filter((p) => p.status === 'active').length
  const completedProjects = projects.filter((p) => p.status === 'completed').length

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M45.7,-76.1C58.9,-69.3,69.2,-55.4,76.5,-40.7C83.8,-26,88.1,-10.5,86.3,4.4C84.5,19.3,76.7,33.5,66.5,45.2C56.3,56.9,43.6,66,29.4,72.4C15.2,78.8,-0.5,82.5,-16.2,80.7C-31.9,78.9,-47.9,71.6,-59.8,60.1C-71.7,48.6,-79.5,32.8,-83.4,16.2C-87.3,-0.4,-87.3,-17.8,-80.7,-32.4C-74.1,-47,-60.9,-58.8,-46.5,-64.8C-32.1,-70.8,-16,-71.1,0.5,-71.8C17,-72.5,32.5,-82.9,45.7,-76.1Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>
        <CardHeader className="pb-4 relative z-10">
          <CardTitle className="text-3xl text-primary font-bold">Bem-vindo ao ECD Audit</CardTitle>
          <CardDescription className="text-base mt-2">
            Selecione uma opção abaixo para começar seu trabalho de auditoria e gestão de documentos
            fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 relative z-10">
          <Button asChild size="lg" className="gap-2 shadow-sm">
            <Link to="/projects">
              <Plus className="h-5 w-5" />
              Novo Projeto
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="gap-2 bg-background/50 backdrop-blur-sm"
          >
            <Link to="/projects">
              <Folder className="h-5 w-5" />
              Abrir Projeto Existente
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : activeProjects}</div>
            <p className="text-xs text-muted-foreground">Projetos em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : completedProjects}</div>
            <p className="text-xs text-muted-foreground">Projetos finalizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : projects.length}</div>
            <p className="text-xs text-muted-foreground">Todos os projetos registrados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
