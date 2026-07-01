import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MessageSquare, AlertCircle, CheckCircle2, BookOpen, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { projectStatusConfig } from '@/lib/status-config'
import type { Project } from '@/services/projects'
import type { AuditComment } from '@/services/audit_comments'

interface ProjectStatusPanelProps {
  project: Project | null
  comments: AuditComment[]
  pendingCount: number
}

export function ProjectStatusPanel({ project, comments, pendingCount }: ProjectStatusPanelProps) {
  if (!project) return null
  const status = projectStatusConfig[project.status]
  const approvedCount = comments.filter((c) => c.status === 'approved').length

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Status do Projeto</CardTitle>
        <CardDescription>Visão geral do projeto selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        <div className={cn('rounded-lg p-4 border', status.bgLight, status.border)}>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{project.name}</p>
              <p className="text-sm text-muted-foreground truncate">{project.client}</p>
            </div>
            <Badge className={cn('shrink-0', status.badge)}>{status.label}</Badge>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {project.updated ? format(new Date(project.updated), 'dd/MM/yyyy') : '-'}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Total de Comentários
            </span>
            <span className="font-bold">{comments.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" /> Pendentes
            </span>
            <span className="font-bold text-orange-600 dark:text-orange-400">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Aprovados
            </span>
            <span className="font-bold text-green-600 dark:text-green-400">{approvedCount}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to={`/projects/${project.id}/balancete`}>
              <BookOpen className="mr-2 h-4 w-4" /> Ver Balancete
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to={`/projects/${project.id}/pending`}>
              <AlertCircle className="mr-2 h-4 w-4" /> Ver Pendências
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to={`/projects/${project.id}/import`}>
              <FileText className="mr-2 h-4 w-4" /> Importar Dados
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
