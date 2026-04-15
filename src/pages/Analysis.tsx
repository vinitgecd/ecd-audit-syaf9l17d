import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart } from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { getAuditCommentsByProject } from '@/services/audit_comments'
import { useRealtime } from '@/hooks/use-realtime'
import useAccountingStore from '@/stores/useAccountingStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const chartConfig = {
  receitas: { label: 'Receitas', color: 'hsl(var(--chart-1))' },
  despesas: { label: 'Despesas', color: 'hsl(var(--chart-2))' },
  circulante: { label: 'Circulante', color: 'hsl(var(--chart-3))' },
  naocirculante: { label: 'Não Circ.', color: 'hsl(var(--chart-4))' },
}

export default function Analysis() {
  const { projectId } = useParams()

  const {
    accounts,
    loading: storeLoading,
    isProcessing,
    error: storeError,
    loadData,
    processedAnalysis,
  } = useAccountingStore()

  const [pendingCount, setPendingCount] = useState(0)
  const [localLoading, setLocalLoading] = useState(true)

  const loadComments = async (id: string) => {
    try {
      const comments = await getAuditCommentsByProject(id)
      setPendingCount(
        comments.filter((c) => c.status === 'pending' || c.status === 'rejected').length,
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLocalLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadData(projectId)
      loadComments(projectId)
    }
  }, [projectId, loadData])

  useRealtime(
    'audit_comments',
    () => {
      if (projectId) loadComments(projectId)
    },
    !!projectId,
  )

  const loading = storeLoading || isProcessing || localLoading
  const error = storeError

  const metrics = processedAnalysis || {
    liquidezCorrente: '0.00',
    endividamento: '0.0',
    margemLiquida: '0.0',
    monthlyData: [],
    balanceData: [],
  }

  const isLoadingData = loading
  const [showSlowWarning, setShowSlowWarning] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isLoadingData) {
      setShowSlowWarning(false)
      timer = setTimeout(() => setShowSlowWarning(true), 2000)
    } else {
      setShowSlowWarning(false)
    }
    return () => clearTimeout(timer)
  }, [isLoadingData])

  if (isLoadingData) {
    return (
      <div className="space-y-6 animate-pulse">
        {showSlowWarning && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-md border border-amber-200 flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-top-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>
              <p className="font-medium text-sm">
                Processando arquivo grande, por favor aguarde... Isso pode levar alguns minutos
                dependendo do tamanho da sua ECD
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-[180px]" />
        </div>
        {accounts.length === 0 && !isLoadingData && !error ? (
          <div className="bg-muted/50 border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center">
            <p className="text-lg font-semibold text-foreground">Projeto sem dados contábeis</p>
            <p className="text-muted-foreground mt-1 mb-4">
              Importe um arquivo SPED ECD na seção "Importar" para visualizar os indicadores e
              gráficos.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-destructive font-medium">Erro ao carregar dados contábeis.</p>
        <Button variant="outline" onClick={() => projectId && loadData(projectId, true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Análise Contábil</h2>
          <p className="text-muted-foreground mt-1">
            Visão detalhada e indicadores computados dos dados importados.
          </p>
        </div>
        <Select defaultValue="2023">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ano Exercício" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2023">Exercício 2023</SelectItem>
            <SelectItem value="2022">Exercício 2022</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Índice de Liquidez Corrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.liquidezCorrente}</div>
            <p className="text-xs text-muted-foreground mt-1">Capacidade de pagamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Grau de Endividamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.endividamento}%</div>
            <p className="text-xs text-muted-foreground mt-1">Capital de terceiros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inconsistências (Alertas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Comentários de auditoria pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margem Líquida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.margemLiquida}%</div>
            <p className="text-xs text-muted-foreground mt-1">Rentabilidade sobre vendas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demonstração de Resultado</CardTitle>
            <CardDescription>Evolução de receitas vs despesas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <AreaChart
                  data={metrics.monthlyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="var(--color-receitas)"
                    fill="var(--color-receitas)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stroke="var(--color-despesas)"
                    fill="var(--color-despesas)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Composição Patrimonial</CardTitle>
            <CardDescription>Estrutura do Ativo e Passivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <BarChart
                  data={metrics.balanceData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="circulante"
                    stackId="a"
                    fill="var(--color-circulante)"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="naocirculante"
                    stackId="a"
                    fill="var(--color-naocirculante)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Auditoria Gerados</CardTitle>
          <CardDescription>
            Cruzamentos automatizados baseados no SPED e regras contábeis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingCount > 0 ? (
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Pendências de Auditoria Encontradas</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Existem {pendingCount} lançamentos com comentários pendentes ou reprovados.
                    Verifique o relatório de pendências para ação.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                Nenhum alerta crítico encontrado nos dados analisados no momento.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
