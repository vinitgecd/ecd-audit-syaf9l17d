import { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertTriangle,
  Building2,
  Wallet,
  Package,
  Car,
  FileSearch,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { useHiddenAssets } from '@/hooks/use-hidden-assets'
import type { AssetCategory, CategoryResult } from '@/services/presuncoes-ativo-oculto'
import type { LucideIcon } from 'lucide-react'

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const CATEGORY_ICONS: Record<AssetCategory, LucideIcon> = {
  imoveis: Building2,
  aplicacoes: Wallet,
  estoques: Package,
  veiculos: Car,
}

const RISK_CONFIG: Record<'low' | 'medium' | 'high', { label: string; className: string }> = {
  high: {
    label: 'Alto',
    className: 'bg-red-500 hover:bg-red-600 text-white border-transparent',
  },
  medium: {
    label: 'Médio',
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent',
  },
  low: {
    label: 'Baixo',
    className: 'bg-green-500 hover:bg-green-600 text-white border-transparent',
  },
}

interface HiddenAssetsPresumptionProps {
  projectId: string | null
}

function AssetCategoryCard({ cat }: { cat: CategoryResult }) {
  const Icon = CATEGORY_ICONS[cat.category]

  return (
    <div className="rounded-lg border p-4 transition-colors hover:bg-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{cat.label}</span>
        </div>
        <span className="font-mono text-sm font-semibold">{fmtCurrency(cat.totalBalance)}</span>
      </div>

      {cat.found ? (
        <>
          <Accordion type="single" collapsible className="mt-3">
            <AccordionItem value={cat.category} className="border-0">
              <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                Ver detalhes ({cat.accountCount} {cat.accountCount === 1 ? 'conta' : 'contas'})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pt-1">
                  {cat.accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {acc.code}
                        </span>
                        <span className="truncate">{acc.name}</span>
                      </div>
                      <span className="font-mono text-xs shrink-0 ml-2">
                        {fmtCurrency(acc.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          {!cat.hasBalance && (
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Saldo zero identificado — verifique se há registros não contabilizados</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>Nenhum registro encontrado</span>
        </div>
      )}
    </div>
  )
}

export function HiddenAssetsPresumption({ projectId }: HiddenAssetsPresumptionProps) {
  const { isLoading, error, assets, riskLevel, recommendations, refetch } = useHiddenAssets(
    projectId || '',
  )

  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  if (!projectId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileSearch className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-semibold">Nenhum projeto selecionado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um projeto para analisar ativos ocultos.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 opacity-70 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  const riskCfg = RISK_CONFIG[riskLevel]
  const showRiskAlert = riskLevel === 'medium' || riskLevel === 'high'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Presunção de Ativo Oculto
            </CardTitle>
            <CardDescription className="mt-1">
              Análise de bens potencialmente não contabilizados
            </CardDescription>
          </div>
          <Badge className={riskCfg.className}>{riskCfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showRiskAlert && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Risco Identificado
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {riskLevel === 'high'
                  ? 'Múltiplas categorias de ativos não foram encontradas. Alto risco de ativos ocultos não contabilizados.'
                  : 'Algumas categorias de ativos não foram encontradas. Possível risco de ativos ocultos.'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {assets.map((cat) => (
            <AssetCategoryCard key={cat.category} cat={cat} />
          ))}
        </div>

        {recommendations.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Recomendações:</p>
            <ul className="space-y-1.5">
              {recommendations.map((rec) => (
                <li
                  key={rec.category}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  {rec.recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground italic">
            Esta análise é baseada nos registros contábeis importados. Consulte um contador para
            validar.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
