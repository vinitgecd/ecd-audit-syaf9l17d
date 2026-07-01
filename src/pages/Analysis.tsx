import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Loader2 } from 'lucide-react'
import { getAuditCommentsByProject } from '@/services/audit_comments'
import { getAccounts, getFiscalYears, getEntryItemsByDateRange } from '@/services/accounting'
import type { Account } from '@/services/accounting'
import { useRealtime } from '@/hooks/use-realtime'
import { AnalysisTable } from '@/components/AnalysisTable'
import { aggregateEntryItems, computeAnalysis, type AnalysisData } from '@/lib/analysis-utils'

export default function Analysis() {
  const { projectId } = useParams()
  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const loadComments = useCallback(async (id: string) => {
    try {
      const comments = await getAuditCommentsByProject(id)
      setPendingCount(
        comments.filter((c: any) => c.status === 'pending' || c.status === 'rejected').length,
      )
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([getFiscalYears(projectId), getAccounts(projectId)])
      .then(([years, accs]) => {
        setFiscalYears(years)
        setAccounts(accs)
        if (years.length > 0) setSelectedYear(String(years[0]))
        else setLoading(false)
      })
      .catch((e) => {
        console.error(e)
        setLoading(false)
      })
    loadComments(projectId)
  }, [projectId, loadComments])

  useEffect(() => {
    if (!projectId || !selectedYear || accounts.length === 0) return
    setLoading(true)
    const year = parseInt(selectedYear)
    Promise.all([
      getEntryItemsByDateRange(projectId, `${year}-01-01`, `${year}-12-31`),
      getEntryItemsByDateRange(projectId, `${year - 1}-01-01`, `${year - 1}-12-31`),
    ])
      .then(([currentItems, prevItems]) => {
        const data = computeAnalysis(
          accounts,
          aggregateEntryItems(currentItems),
          aggregateEntryItems(prevItems),
        )
        setAnalysisData(data)
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [projectId, selectedYear, accounts])

  useRealtime(
    'audit_comments',
    () => {
      if (projectId) loadComments(projectId)
    },
    !!projectId,
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Análise Contábil</h2>
          <p className="text-muted-foreground mt-1">
            Análise Vertical (AV) e Horizontal (AH) dos dados importados.
          </p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ano Exercício" />
          </SelectTrigger>
          <SelectContent>
            {fiscalYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                Exercício {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {fiscalYears.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum lançamento encontrado. Importe um arquivo SPED ECD para visualizar a análise.
          </CardContent>
        </Card>
      ) : analysisData ? (
        <Tabs defaultValue="bp">
          <TabsList>
            <TabsTrigger value="bp">Balanço Patrimonial</TabsTrigger>
            <TabsTrigger value="dre">DRE</TabsTrigger>
          </TabsList>
          <TabsContent value="bp" className="mt-4">
            <AnalysisTable
              title="Balanço Patrimonial (BP)"
              description={`Análise Vertical e Horizontal — Exercício ${selectedYear}`}
              rows={analysisData.bpRows}
              totals={[
                { label: 'Total Ativo', value: analysisData.totalAssets },
                { label: 'Total Passivo + PL', value: analysisData.totalLiabilitiesEquity },
              ]}
              emptyMessage="Nenhum dado de balanço patrimonial encontrado para o período selecionado."
            />
          </TabsContent>
          <TabsContent value="dre" className="mt-4">
            <AnalysisTable
              title="Demonstração do Resultado (DRE)"
              description={`Análise Vertical e Horizontal — Exercício ${selectedYear}`}
              rows={analysisData.dreRows}
              totals={[{ label: 'Total Receitas', value: analysisData.totalRevenue }]}
              emptyMessage="Nenhum dado de DRE encontrado para o período selecionado."
            />
          </TabsContent>
        </Tabs>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Auditoria</CardTitle>
          <CardDescription>
            Cruzamentos automatizados baseados no SPED e regras contábeis
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
