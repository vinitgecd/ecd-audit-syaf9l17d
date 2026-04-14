import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Search,
  FileSpreadsheet,
  FileText,
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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

  const ledgerData = useMemo(() => {
    if (!account) return { periodData: [], priorBalance: 0, finalBalance: 0, isCreditNormal: false }

    const isCreditNormal =
      account.type === 'liability' || account.type === 'equity' || account.type === 'revenue'

    let currentBalance = 0
    let priorBalance = 0

    const periodData: any[] = []

    entries.forEach((item) => {
      const dateStr = item.expand?.entry_id?.date ? item.expand.entry_id.date.substring(0, 10) : ''

      const isPrior = startDate && dateStr < startDate
      const isAfter = endDate && dateStr > endDate

      if (isAfter) return

      const isDebit = item.type === 'debit'
      const value = item.value

      const effect = isCreditNormal ? (isDebit ? -value : value) : isDebit ? value : -value

      if (isPrior) {
        priorBalance += effect
        currentBalance += effect
      } else {
        currentBalance += effect

        const itemCounterparts = counterparts[item.entry_id] || []
        const otherAccounts = itemCounterparts.filter((c) => c.id !== item.id)
        const counterpartStr =
          otherAccounts.length === 1
            ? `${otherAccounts[0].expand?.account_id?.code} - ${otherAccounts[0].expand?.account_id?.name}`
            : otherAccounts.length > 1
              ? 'Diversos'
              : '-'

        periodData.push({
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
        })
      }
    })

    return { periodData, priorBalance, finalBalance: currentBalance, isCreditNormal }
  }, [entries, account, counterparts, startDate, endDate])

  const filteredData = useMemo(() => {
    if (!searchQuery) return ledgerData.periodData
    const q = searchQuery.toLowerCase()
    return ledgerData.periodData.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.counterpartStr.toLowerCase().includes(q),
    )
  }, [ledgerData.periodData, searchQuery])

  const getPriorDc = () => {
    if (ledgerData.priorBalance === 0) return ''
    return ledgerData.isCreditNormal
      ? ledgerData.priorBalance > 0
        ? 'C'
        : 'D'
      : ledgerData.priorBalance > 0
        ? 'D'
        : 'C'
  }

  const handleExportCSV = () => {
    let csvContent = 'Data,Histórico,Referência,Contrapartida,Débito,Crédito,Saldo,D/C\n'

    if (startDate) {
      csvContent += `${format(parseISO(startDate), 'dd/MM/yyyy')},SALDO ANTERIOR,,,,0.00,0.00,${Math.abs(ledgerData.priorBalance).toFixed(2)},${getPriorDc()}\n`
    }

    filteredData.forEach((row) => {
      const debit = row.type === 'debit' ? row.value.toFixed(2) : ''
      const credit = row.type === 'credit' ? row.value.toFixed(2) : ''
      const desc = row.description.replace(/"/g, '""')
      const ref = row.reference.replace(/"/g, '""')
      const cp = row.counterpartStr.replace(/"/g, '""')
      csvContent += `${row.dateStr},"${desc}","${ref}","${cp}",${debit},${credit},${row.runningBalance.toFixed(2)},${row.dc}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `razao_${account?.code || 'conta'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    const printWindow = window.open('', '', 'height=800,width=1000')
    if (!printWindow) return

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Razão Analítico - ${account?.code}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; color: #333; }
            h2 { margin-bottom: 5px; color: #000; }
            .header-info { margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
            .header-info p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px 6px; text-align: left; vertical-align: top; }
            th { background-color: #f4f4f4; font-weight: bold; color: #000; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-blue { color: #2563eb; }
            .text-red { color: #dc2626; }
            .font-bold { font-weight: bold; }
            .text-xs { font-size: 10px; color: #666; }
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2>Razão Analítico</h2>
            <p><strong>Conta:</strong> ${account?.code} - ${account?.name}</p>
            <p><strong>Tipo:</strong> <span style="text-transform: capitalize;">${account?.type}</span></p>
            <p><strong>Período:</strong> ${startDate ? format(parseISO(startDate), 'dd/MM/yyyy') : 'Início'} a ${endDate ? format(parseISO(endDate), 'dd/MM/yyyy') : 'Fim'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th width="80">Data</th>
                <th>Histórico</th>
                <th width="100">Referência</th>
                <th width="200">Contrapartida</th>
                <th width="80" class="text-right">Débito</th>
                <th width="80" class="text-right">Crédito</th>
                <th width="100" class="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
    `

    if (startDate) {
      html += `
        <tr>
          <td>${format(parseISO(startDate), 'dd/MM/yyyy')}</td>
          <td colspan="3" class="font-bold">SALDO ANTERIOR</td>
          <td></td>
          <td></td>
          <td class="text-right font-bold">${formatNum(Math.abs(ledgerData.priorBalance))} <span class="text-xs">${getPriorDc()}</span></td>
        </tr>
      `
    }

    filteredData.forEach((row) => {
      html += `
        <tr>
          <td>${row.dateStr}</td>
          <td>${row.description}</td>
          <td>${row.reference}</td>
          <td>${row.counterpartStr}</td>
          <td class="text-right text-blue">${row.type === 'debit' ? formatNum(row.value) : ''}</td>
          <td class="text-right text-red">${row.type === 'credit' ? formatNum(row.value) : ''}</td>
          <td class="text-right">${formatNum(row.runningBalance)} <span class="text-xs">${row.dc}</span></td>
        </tr>
      `
    })

    const finalDc =
      ledgerData.finalBalance === 0
        ? ''
        : ledgerData.isCreditNormal
          ? ledgerData.finalBalance > 0
            ? 'C'
            : 'D'
          : ledgerData.finalBalance > 0
            ? 'D'
            : 'C'
    html += `
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="text-right font-bold">SALDO FINAL</td>
                <td class="text-right font-bold">${formatNum(Math.abs(ledgerData.finalBalance))} <span class="text-xs">${finalDc}</span></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleOpenCommentModal = (e: React.MouseEvent, row: any) => {
    e.stopPropagation()
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
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/balancete')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl font-bold text-foreground">Razão Analítico</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-[130px] h-9"
              title="Data Inicial"
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-[130px] h-9"
              title="Data Final"
            />
          </div>
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar histórico ou referência..."
              className="pl-9 bg-card h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              title="Exportar para Excel/CSV"
              className="h-9"
            >
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              title="Exportar para PDF"
              className="h-9"
            >
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
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
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Saldo Período
            </span>
            <span
              className={cn(
                'text-lg font-bold',
                ledgerData.finalBalance !== 0 &&
                  ledgerData.isCreditNormal !== ledgerData.finalBalance > 0
                  ? 'text-red-600'
                  : 'text-green-600',
              )}
            >
              {formatNum(Math.abs(ledgerData.finalBalance))}
              <span className="text-sm font-normal ml-1 text-muted-foreground">
                {ledgerData.finalBalance === 0
                  ? ''
                  : ledgerData.isCreditNormal
                    ? ledgerData.finalBalance > 0
                      ? 'C'
                      : 'D'
                    : ledgerData.finalBalance > 0
                      ? 'D'
                      : 'C'}
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
            ) : filteredData.length === 0 && !startDate ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  Nenhum lançamento encontrado para o período ou critérios selecionados.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {startDate && (
                  <TableRow className="bg-muted/10">
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {format(parseISO(startDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="py-2 text-sm font-semibold" colSpan={3}>
                      SALDO ANTERIOR
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="py-2 text-sm text-right tabular-nums font-semibold">
                      {formatNum(Math.abs(ledgerData.priorBalance))}
                      <span className="text-muted-foreground text-xs ml-1 font-normal">
                        {getPriorDc()}
                      </span>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
                {filteredData.length === 0 && startDate ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Nenhum lançamento encontrado para os filtros selecionados.
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
              </>
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
