import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { commentStatusConfig } from '@/lib/status-config'
import type { AuditComment } from '@/services/audit_comments'

interface AlertasCriticosProps {
  comments: AuditComment[]
  loading: boolean
  projectId: string | null
}

export function AlertasCriticos({ comments, loading, projectId }: AlertasCriticosProps) {
  const recent = [...comments]
    .sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime())
    .slice(0, 8)

  return (
    <Card className="lg:col-span-2 flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas Críticos
            </CardTitle>
            <CardDescription className="mt-1">
              Comentários e inconsistências recentes do projeto.
            </CardDescription>
          </div>
          {projectId && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/projects/${projectId}/pending`}>
                Ver todos <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border rounded-lg border-dashed">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3 opacity-50" />
            Nenhuma inconsistência encontrada. Tudo certo!
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {recent.map((comment) => {
                const cStatus = commentStatusConfig[comment.status || 'pending']
                return (
                  <div
                    key={comment.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between p-4 border rounded-lg gap-3 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {comment.entry_reference}
                        </span>
                        <Badge variant="outline" className={cn('text-xs', cStatus.className)}>
                          {cStatus.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{comment.comment}</p>
                      <p className="text-xs text-muted-foreground">
                        {comment.created
                          ? format(new Date(comment.created), "dd/MM/yyyy 'às' HH:mm")
                          : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
