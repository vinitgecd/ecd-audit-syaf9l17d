import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, BookOpen, AlertTriangle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardsProps {
  totalEntries: number
  totalAccounts: number
  pendingAlerts: number
  activeProjects: number
  totalProjects: number
  loading: boolean
}

export function KpiCards({
  totalEntries,
  totalAccounts,
  pendingAlerts,
  activeProjects,
  totalProjects,
  loading,
}: KpiCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Lançamentos</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold">{totalEntries}</div>
          )}
          <p className="text-xs text-muted-foreground">Lançamentos contábeis</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contas Analisadas</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold">{totalAccounts}</div>
          )}
          <p className="text-xs text-muted-foreground">Plano de contas</p>
        </CardContent>
      </Card>

      <Card
        className={cn(
          'border-l-4',
          pendingAlerts > 0 ? 'border-l-orange-500' : 'border-l-green-500',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas Pendentes</CardTitle>
          <AlertTriangle
            className={cn('h-4 w-4', pendingAlerts > 0 ? 'text-orange-500' : 'text-green-500')}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div
              className={cn(
                'text-2xl font-bold',
                pendingAlerts > 0
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-green-600 dark:text-green-400',
              )}
            >
              {pendingAlerts}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Aguardando revisão</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeProjects}</div>
          <p className="text-xs text-muted-foreground">de {totalProjects} projetos</p>
        </CardContent>
      </Card>
    </div>
  )
}
