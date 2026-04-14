import { useEffect, useState, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Folder, Plus, FileText, CheckCircle2, Archive, Activity, Clock } from 'lucide-react'
import { getProjects, Project } from '@/services/projects'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'

const StatusBadge = ({ status }: { status: Project['status'] }) => {
  const config = {
    active: {
      label: 'Ativo',
      className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent',
    },
    completed: {
      label: 'Concluído',
      className: 'bg-green-500 hover:bg-green-600 text-white border-transparent',
    },
    archived: {
      label: 'Arquivado',
      className:
        'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    },
  }
  const current = config[status] || { label: status, className: '' }
  return <Badge className={current.className}>{current.label}</Badge>
}

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

  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === 'active').length
  const completedProjects = projects.filter((p) => p.status === 'completed').length
  const archivedProjects = projects.filter((p) => p.status === 'archived').length

  const activePct = totalProjects === 0 ? 0 : (activeProjects / totalProjects) * 100
  const completedPct = totalProjects === 0 ? 0 : (completedProjects / totalProjects) * 100
  const archivedPct = totalProjects === 0 ? 0 : (archivedProjects / totalProjects) * 100

  const recentProjects = projects.slice(0, 5)

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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : totalProjects}</div>
            <p className="text-xs text-muted-foreground">Todos os registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : activeProjects}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : completedProjects}</div>
            <p className="text-xs text-muted-foreground">Finalizados com sucesso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Arquivados</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : archivedProjects}</div>
            <p className="text-xs text-muted-foreground">Armazenados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Projetos Recentes</CardTitle>
            <CardDescription>Seus últimos projetos modificados ou criados.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium leading-none">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(project.updated), 'dd/MM/yyyy')}
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              ))}
              {!loading && recentProjects.length === 0 && (
                <div className="text-center text-muted-foreground py-8 border rounded-lg border-dashed">
                  Nenhum projeto encontrado.
                </div>
              )}
              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Distribuição</CardTitle>
            <CardDescription>Visão geral dos status.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center space-y-8 pb-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2 text-foreground/80">
                  <Activity className="w-4 h-4 text-blue-500" /> Ativos
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {activePct.toFixed(0)}%
                </span>
              </div>
              <Progress
                value={loading ? 0 : activePct}
                className="h-2.5 bg-blue-100 dark:bg-blue-950 [&>div]:bg-blue-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2 text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Concluídos
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {completedPct.toFixed(0)}%
                </span>
              </div>
              <Progress
                value={loading ? 0 : completedPct}
                className="h-2.5 bg-green-100 dark:bg-green-950 [&>div]:bg-green-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2 text-foreground/80">
                  <Archive className="w-4 h-4 text-gray-500" /> Arquivados
                </span>
                <span className="font-bold text-gray-600 dark:text-gray-400">
                  {archivedPct.toFixed(0)}%
                </span>
              </div>
              <Progress
                value={loading ? 0 : archivedPct}
                className="h-2.5 bg-gray-100 dark:bg-gray-800 [&>div]:bg-gray-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
