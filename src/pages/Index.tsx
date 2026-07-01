import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart2, Plus, Activity, CheckCircle2, Archive } from 'lucide-react'
import { getProjects, Project } from '@/services/projects'
import { getAuditCommentsByProject, AuditComment } from '@/services/audit_comments'
import { getDashboardStats } from '@/services/dashboard'
import { useRealtime } from '@/hooks/use-realtime'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { AlertasCriticos } from '@/components/dashboard/AlertasCriticos'
import { ProjectStatusPanel } from '@/components/dashboard/ProjectStatusPanel'

const STORAGE_KEY = 'ecd-audit-selected-project'

export default function Index() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [comments, setComments] = useState<AuditComment[]>([])
  const [stats, setStats] = useState({ totalEntries: 0, totalAccounts: 0 })
  const [loading, setLoading] = useState(true)
  const [projectLoading, setProjectLoading] = useState(false)

  const fetchProjects = useCallback(async () => {
    if (!user) return
    try {
      const data = await getProjects()
      setProjects(data)
      const stored = localStorage.getItem(STORAGE_KEY)
      const valid = stored && data.find((p) => p.id === stored)
      if (valid) {
        setSelectedProjectId(stored)
      } else if (data.length > 0) {
        const active = data.find((p) => p.status === 'active') || data[0]
        setSelectedProjectId(active.id)
        localStorage.setItem(STORAGE_KEY, active.id)
      } else {
        setSelectedProjectId(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchProjectData = useCallback(async (pid: string) => {
    setProjectLoading(true)
    try {
      const [comms, s] = await Promise.all([getAuditCommentsByProject(pid), getDashboardStats(pid)])
      setComments(comms)
      setStats(s)
    } catch (e) {
      console.error(e)
    } finally {
      setProjectLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectData(selectedProjectId)
    } else {
      setComments([])
      setStats({ totalEntries: 0, totalAccounts: 0 })
    }
  }, [selectedProjectId, fetchProjectData])

  useRealtime('projects', () => fetchProjects(), !!user)
  useRealtime(
    'audit_comments',
    () => {
      if (selectedProjectId) fetchProjectData(selectedProjectId)
    },
    !!selectedProjectId,
  )
  useRealtime(
    'journal_entries',
    () => {
      if (selectedProjectId) fetchProjectData(selectedProjectId)
    },
    !!selectedProjectId,
  )

  const handleProjectChange = (id: string) => {
    setSelectedProjectId(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  )
  const pendingAlerts = useMemo(() => comments.filter((c) => c.status === 'pending'), [comments])
  const activeProjects = projects.filter((p) => p.status === 'active').length
  const completedProjects = projects.filter((p) => p.status === 'completed').length
  const archivedProjects = projects.filter((p) => p.status === 'archived').length

  if (!user) return <Navigate to="/login" replace />

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-3xl text-primary font-bold">Bem-vindo ao ECD Audit</CardTitle>
          <CardDescription className="text-base mt-2">
            Comece criando seu primeiro projeto de auditoria ECD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="gap-2">
            <Link to="/projects">
              <Plus className="h-5 w-5" /> Criar Novo Projeto
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <BarChart2 className="w-64 h-64 text-primary" />
        </div>
        <CardHeader className="pb-4 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-3xl text-primary font-bold">Resumo Executivo</CardTitle>
              <CardDescription className="text-base mt-2">
                Monitore o status da auditoria ECD e identifique alertas críticos rapidamente.
              </CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Select value={selectedProjectId || undefined} onValueChange={handleProjectChange}>
                <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <KpiCards
        totalEntries={stats.totalEntries}
        totalAccounts={stats.totalAccounts}
        pendingAlerts={pendingAlerts.length}
        activeProjects={activeProjects}
        totalProjects={projects.length}
        loading={projectLoading}
      />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <AlertasCriticos
          comments={comments}
          loading={projectLoading}
          projectId={selectedProjectId}
        />
        <ProjectStatusPanel
          project={selectedProject}
          comments={comments}
          pendingCount={pendingAlerts.length}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Projetos</CardTitle>
          <CardDescription>Visão geral de todos os seus projetos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {activeProjects}
                </p>
                <p className="text-xs text-muted-foreground">Projetos Ativos</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completedProjects}
                </p>
                <p className="text-xs text-muted-foreground">Projetos Concluídos</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <Archive className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {archivedProjects}
                </p>
                <p className="text-xs text-muted-foreground">Projetos Arquivados</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
