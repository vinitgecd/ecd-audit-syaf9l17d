import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, MessageSquare, MessageSquarePlus, Search } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getAccount,
  getAccountEntries,
  getEntryItemsByEntryIds,
  Account,
  EntryItem,
} from '@/services/accounting'
import { getAuditCommentsByProject, AuditComment } from '@/services/audit_comments'
import { AuditCommentModal } from '@/components/AuditCommentModal'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export default function Razao() {
  const navigate = useNavigate()
  const { projectId, accountId } = useParams()
  const { user } = useAuth()

  const [account, setAccount] = useState<Account | null>(null)
  const [entries, setEntries] = useState<EntryItem[]>([])
  const [counterparts, setCounterparts] = useState<Record<string, EntryItem[]>>({})
  const [comments, setComments] = useState<Record<string, AuditComment>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [selectedEntryForComment, setSelectedEntryForComment] = useState<any>(null)

  useEffect(() => {
    if (!accountId || !projectId) return
    setLoading(true)

    Promise.all([
      getAccount(accountId),
      getAccountEntries(accountId),
      getAuditCommentsByProject(projectId),
    ])
      .then(async ([acc, mainEntries, auditCommentsList]) => {
        setAccount(acc)
        setEntries(mainEntries)

        const cMap: Record<string, AuditComment> = {}
        auditCommentsList.forEach((c) => {
          cMap[c.entry_reference] = c
        })
        setComments(cMap)

        const entryIds = Array.from(new Set(mainEntries.map((e) => e.entry_id)))
        const allItems = await getEntryItemsByEntryIds(entryIds)

        const cpMap: Record<string, EntryItem[]> = {}
        allItems.forEach((item) => {
          if (!cpMap[item.entry_id]) cpMap[item.entry_id] = []
          cpMap[item.entry_id].push(item)
        })
        setCounterparts(cpMap)

        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [accountId, projectId])

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

  const processedData = useMemo(() => {
    if (!account) return []

    const isCreditNormal =
      account.type === 'liability' || account.type === 'equity' || account.type === 'revenue'
    let currentBalance = 0

    return entries.map((item) => {
      const isDebit = item.type === 'debit'
      if (isCreditNormal) {
        currentBalance += isDebit ? -item.value : item.value
      } else {
        currentBalance += isDebit ? item.value : -item.value
      }

      const itemCounterparts = counterparts[item.entry_id] || []
      const otherAccounts = itemCounterparts.filter((c) => c.id !== item.id)
      const counterpartStr =
        otherAccounts.length === 1
          ? `${otherAccounts[0].expand?.account_id?.code} - ${otherAccounts[0].expand?.account_id?.name}`
          : otherAccounts.length > 1
            ? 'Diversos'
            : '-'

      return {
        ...item,
        dateStr: item.expand?.entry_id?.date
          ? format(parseISO(item.expand.entry_id.date), 'dd/MM/yyyy')
          : '',
        description: item.expand?.entry_id?.description || '',
        reference: item.expand?.entry_id?.reference || '',
        counterpartStr,
        runningBalance: Math.abs(currentBalance),
        dc:
          currentBalance === 0
            ? ''
            : isCreditNormal
              ? currentBalance > 0
                ? 'C'
                : 'D'
              : currentBalance > 0
                ? 'D'
                : 'C',
      }
    })
  }, [entries, account, counterparts])

  const filteredData = useMemo(() => {
    if (!searchQuery) return processedData
    const q = searchQuery.toLowerCase()
    return processedData.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.counterpartStr.toLowerCase().includes(q),
    )
  }, [processedData, searchQuery])

  const handleOpenCommentModal = (e: React.MouseEvent, row: any) => {
    e.stopPropagation()
    // Formatting object to maintain compatibility with existing AuditCommentModal
    setSelectedEntryForComment({
      id: row.id,
      data: row.dateStr,
      codigoConta: account?.code,
      conta: account?.name,
      dc: row.type === 'debit' ? 'D' : 'C',
      valor: row.value,
      saldo: row.runningBalance,
      dcSaldo: row.dc,
      historico: row.description,
      numero: row.reference,
    })
    setIsCommentModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/balancete')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl font-bold text-foreground">Razão Analítico</h2>
        </div>
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar histórico ou referência..."
            className="pl-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="shadow-sm shrink-0">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Conta</span>
            <span className="text-sm font-semibold">
              {account ? `${account.code} - ${account.name}` : '-'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Tipo</span>
            <span className="text-sm font-semibold capitalize">{account?.type || '-'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Saldo Final</span>
            <span
              className={cn(
                'text-lg font-bold',
                processedData.length > 0 &&
                  processedData[processedData.length - 1].dc === 'C' &&
                  account?.type !== 'liability' &&
                  account?.type !== 'equity' &&
                  account?.type !== 'revenue'
                  ? 'text-red-600'
                  : 'text-green-600',
              )}
            >
              {processedData.length > 0
                ? formatNum(processedData[processedData.length - 1].runningBalance)
                : '0,00'}
              <span className="text-sm font-normal ml-1 text-muted-foreground">
                {processedData.length > 0 ? processedData[processedData.length - 1].dc : ''}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card flex-1 overflow-auto shadow-sm">
        <Table className="relative min-w-[1000px]">
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm border-b">
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Histórico</TableHead>
              <TableHead className="w-[120px]">Referência</TableHead>
              <TableHead className="w-[250px]">Contrapartida</TableHead>
              <TableHead className="w-[120px] text-right">Débito</TableHead>
              <TableHead className="w-[120px] text-right">Crédito</TableHead>
              <TableHead className="w-[140px] text-right">Saldo</TableHead>
              <TableHead className="w-[80px] text-center">Auditoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando razão...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No transactions found for this account.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => {
                const hasComment = !!comments[row.id]
                const comment = comments[row.id]

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'transition-colors py-1 h-10',
                      hasComment && 'bg-blue-50/30 dark:bg-blue-900/10',
                    )}
                  >
                    <TableCell className="py-2 text-sm">{row.dateStr}</TableCell>
                    <TableCell className="py-2 text-sm">
                      <div>{row.description}</div>
                      {hasComment && (
                        <div className="mt-1 flex items-start gap-1.5 bg-background/50 p-1.5 rounded-md border border-blue-100 dark:border-blue-900">
                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="text-xs text-blue-700 dark:text-blue-300 italic">
                            {comment.comment}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-sm font-mono text-muted-foreground">
                      {row.reference}
                    </TableCell>
                    <TableCell
                      className="py-2 text-sm text-muted-foreground truncate max-w-[250px]"
                      title={row.counterpartStr}
                    >
                      {row.counterpartStr}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right tabular-nums text-blue-600 font-medium">
                      {row.type === 'debit' ? formatNum(row.value) : ''}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right tabular-nums text-red-600 font-medium">
                      {row.type === 'credit' ? formatNum(row.value) : ''}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right tabular-nums font-semibold">
                      {formatNum(row.runningBalance)}
                      <span className="text-muted-foreground text-xs ml-1 font-normal">
                        {row.dc}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8',
                          hasComment &&
                            'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50',
                        )}
                        onClick={(e) => handleOpenCommentModal(e, row)}
                        title="Comentário de Auditoria"
                      >
                        {hasComment ? (
                          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-blue-100 dark:fill-blue-900/30" />
                        ) : (
                          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AuditCommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        entry={selectedEntryForComment}
        comment={selectedEntryForComment ? comments[selectedEntryForComment.id] || null : null}
        projectId={projectId!}
        userId={user?.id!}
      />
    </div>
  )
}
