import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDatabase } from '@/contexts/DatabaseContext'
import {
  ArrowLeft,
  Search,
  Scale,
  Loader2,
  FileText,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getAuditCommentsByProject, AuditComment } from '@/services/audit_comments'
import {
  getCashAccounts,
  getNegativeCashBalanceEntries,
  hasProjectData,
  CashBalanceEntry,
} from '@/services/presuncoes'
import { AuditCommentModal } from '@/components/AuditCommentModal'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export default function PresuncoesLegais() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { user } = useAuth()
  const { isReady } = useDatabase()

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<CashBalanceEntry[]>([])
  const [cashAccounts, setCashAccounts] = useState<{ id: string; code: string; name: string }[]>([])
  const [comments, setComments] = useState<Record<string, AuditComment>>({})
  const [hasData, setHasData] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [selectedComment, setSelectedComment] = useState<AuditComment | null>(null)

  const fetchData = useCallback(async () => {
    if (!isReady || !projectId) return
    setLoading(true)
    try {
      const [accounts, negEntries, auditComments, hasAny] = await Promise.all([
        getCashAccounts(projectId),
        getNegativeCashBalanceEntries(projectId),
        getAuditCommentsByProject(projectId).catch(() => [] as AuditComment[]),
        hasProjectData(projectId),
      ])

      setCashAccounts(accounts.map((a) => ({ id: a.id, code: a.code, name: a.name })))
      setEntries(negEntries)
      setHasData(hasAny)

      const cMap: Record<string, AuditComment> = {}
      auditComments.forEach((c) => {
        cMap[c.entry_reference] = c
      })
      setComments(cMap)
    } catch (err) {
      console.error('Error fetching presunções data:', err)
      toast.error('Erro ao carregar dados das presunções legais.')
    } finally {
      setLoading(false)
    }
  }, [isReady, projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime(
    'audit_comments',
    (e) => {
      if (e.record.project_id !== projectId) return
      if (e.action === 'create' || e.action === 'update') {
        setComments((prev) => ({
          ...prev,
          [e.record.entry_reference]: e.record as unknown as AuditComment,
        }))
      } else if (e.action === 'delete') {
        setComments((prev) => {
          const next = { ...prev }
          delete next[e.record.entry_reference]
          return next
        })
      }
    },
    !!projectId,
  )

  const filteredEntries = useMemo(() => {
    let result = entries
    if (selectedAccountId !== 'all') {
      result = result.filter((e) => e.account_id === selectedAccountId)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.entryDescription.toLowerCase().includes(q) ||
          e.entryReference.toLowerCase().includes(q),
      )
    }
    if (startDate) result = result.filter((e) => e.entryDate >= startDate)
    if (endDate) result = result.filter((e) => e.entryDate <= endDate)
    return result
  }, [entries, selectedAccountId, searchQuery, startDate, endDate])

  const handleOpenModal = (entry: CashBalanceEntry) => {
    setSelectedEntry({
      id: entry.id,
      data: entry.entryDate ? format(parseISO(entry.entryDate), 'dd/MM/yyyy') : '',
      codigoConta: entry.accountCode,
      conta: entry.accountName,
      valor: entry.value,
      dc: entry.type === 'debit' ? 'D' : 'C',
    })
    setSelectedComment(comments[entry.id] || null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedEntry(null)
    setSelectedComment(null)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/balancete`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Presunções Legais</h2>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Saldo Credor de Caixa — Inciso II da LC 214/2025
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Quando a conta Caixa ou equivalentes apresenta saldo negativo, a diferença é
                considerada receita omitida por não haver justificativa para disponibilidade
                inexistente.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Analisando lançamentos...</p>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
              <p className="text-base font-medium text-foreground">
                Nenhum dado encontrado. Por favor, realize a importação do arquivo ECD primeiro para
                visualizar as presunções legais.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[140px] h-9"
                    title="Data Inicial"
                  />
                  <span className="text-muted-foreground text-sm">até</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[140px] h-9"
                    title="Data Final"
                  />
                </div>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full sm:w-[240px] h-9">
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as contas</SelectItem>
                    {cashAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por histórico..."
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Scale className="h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-base font-medium text-foreground">
                    Nenhuma irregularidade encontrada para os filtros selecionados.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[100px]">Data</TableHead>
                        <TableHead className="w-[200px]">Conta Contábil</TableHead>
                        <TableHead>Histórico</TableHead>
                        <TableHead className="w-[120px] text-right">Débito</TableHead>
                        <TableHead className="w-[120px] text-right">Crédito</TableHead>
                        <TableHead className="w-[140px] text-right">Saldo</TableHead>
                        <TableHead className="w-[100px] text-center">Anotações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => {
                        const hasComment = !!comments[entry.id]
                        return (
                          <TableRow
                            key={entry.id}
                            className={cn(
                              'transition-colors',
                              hasComment && 'bg-blue-50/30 dark:bg-blue-900/10',
                            )}
                          >
                            <TableCell className="py-2 text-sm">
                              {entry.entryDate
                                ? format(parseISO(entry.entryDate), 'dd/MM/yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="py-2 text-sm">
                              <span className="font-mono text-xs">{entry.accountCode}</span>
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {entry.accountName}
                              </span>
                            </TableCell>
                            <TableCell
                              className="py-2 text-sm truncate max-w-[300px]"
                              title={entry.entryDescription}
                            >
                              {entry.entryDescription}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right tabular-nums text-blue-600 font-medium">
                              {entry.type === 'debit' ? formatNum(entry.value) : ''}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right tabular-nums text-red-600 font-medium">
                              {entry.type === 'credit' ? formatNum(entry.value) : ''}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right tabular-nums font-semibold text-red-600">
                              {formatNum(Math.abs(entry.runningBalance))}
                              <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                                C
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Button
                                variant={hasComment ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => handleOpenModal(entry)}
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                {hasComment && (
                                  <span className="ml-1 text-xs">
                                    {comments[entry.id].status === 'approved'
                                      ? 'OK'
                                      : comments[entry.id].status === 'rejected'
                                        ? 'Rep'
                                        : 'Pend'}
                                  </span>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredEntries.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {filteredEntries.length} lançamento(s) com saldo credor identificado(s).
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AuditCommentModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        entry={selectedEntry}
        comment={selectedComment}
        projectId={projectId!}
        userId={user?.id!}
      />
    </div>
  )
}
