import { Fragment, useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileDown,
  FileText,
  Printer,
  CalendarIcon,
  Search,
  ChevronRight,
  ArrowRightLeft,
  MessageSquare,
  MessageSquarePlus,
} from 'lucide-react'
import { format, parse, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'

import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { getAuditCommentsByProject, AuditComment } from '@/services/audit_comments'
import { DATA_WITH_IDS } from '@/lib/mock-data'
import { AuditCommentModal } from '@/components/AuditCommentModal'

type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

const parseDateStr = (dateStr: string) => parse(dateStr, 'dd/MM/yyyy', new Date())

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <span>{text}</span>
  const regex = new RegExp(`(${highlight})`, 'gi')
  const parts = text.split(regex)
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200/80 font-semibold text-black rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

export default function Razao() {
  const navigate = useNavigate()
  const { accountId } = useParams()
  const { user } = useAuth()

  const [date, setDate] = useState<DateRange | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [projectId, setProjectId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, AuditComment>>({})

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [selectedEntryForComment, setSelectedEntryForComment] = useState<
    (typeof DATA_WITH_IDS)[0] | null
  >(null)

  const accountInfo = {
    codigo: accountId || '101907',
    descricao: 'CAIXA GERAL',
    saldoInicial: '11.256,49 D',
    saldoFinal: '10.059,26 D',
  }

  useEffect(() => {
    if (user?.id) {
      pb.collection('projects')
        .getFirstListItem(`user_id = "${user.id}"`)
        .then((p) => setProjectId(p.id))
        .catch(() => setProjectId(null))
    }
  }, [user])

  useEffect(() => {
    if (projectId) {
      getAuditCommentsByProject(projectId).then((list) => {
        const map: Record<string, AuditComment> = {}
        list.forEach((c) => {
          map[c.entry_reference] = c
        })
        setComments(map)
      })
    }
  }, [projectId])

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
    let entries = DATA_WITH_IDS.filter((r) => r.codigoConta === accountInfo.codigo)

    if (date?.from) {
      const from = startOfDay(date.from)
      const to = date.to ? endOfDay(date.to) : endOfDay(date.from)
      entries = entries.filter((r) => {
        const d = parseDateStr(r.data)
        return d >= from && d <= to
      })
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      entries = entries.filter((r) => r.historico.toLowerCase().includes(lowerQuery))
    }

    if (typeFilter !== 'all') {
      entries = entries.filter((r) => r.dc === typeFilter)
    }

    if (statusFilter !== 'all') {
      entries = entries.filter((r) => {
        const c = comments[r.id]
        if (!c) return false
        return c.status === statusFilter
      })
    }

    return entries
  }, [accountInfo.codigo, date, searchQuery, typeFilter, statusFilter, comments])

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const handleOpenCommentModal = (e: React.MouseEvent, row: (typeof DATA_WITH_IDS)[0]) => {
    e.stopPropagation()
    setSelectedEntryForComment(row)
    setIsCommentModalOpen(true)
  }

  const renderStatusBadge = (status?: string) => {
    if (status === 'approved')
      return <Badge className="bg-green-500 hover:bg-green-600 mt-1">Aprovado</Badge>
    if (status === 'rejected')
      return (
        <Badge variant="destructive" className="mt-1">
          Reprovado
        </Badge>
      )
    if (status === 'pending')
      return (
        <Badge variant="outline" className="mt-1 border-yellow-500 text-yellow-600 bg-yellow-50/50">
          Pendente
        </Badge>
      )
    return null
  }

  const exportToExcel = () => {
    const headers = [
      'Data',
      'Cód. Conta',
      'Conta',
      'D/C',
      'Valor',
      'Histórico',
      'Comentário Auditoria',
      'Status Auditoria',
    ]
    const rows = filteredEntries.map((row) => {
      const comment = comments[row.id]
      const statusStr =
        comment?.status === 'approved'
          ? 'Aprovado'
          : comment?.status === 'rejected'
            ? 'Reprovado'
            : comment?.status === 'pending'
              ? 'Pendente'
              : ''
      return [
        row.data,
        row.codigoConta,
        `"${row.conta}"`,
        row.dc,
        row.valor,
        `"${row.historico.replace(/"/g, '""')}"`,
        `"${comment?.comment ? comment.comment.replace(/"/g, '""') : ''}"`,
        statusStr,
      ].join(',')
    })

    const dateStr = date?.from
      ? `Período:,${format(date.from, 'dd/MM/yyyy')} a ${
          date.to ? format(date.to, 'dd/MM/yyyy') : format(date.from, 'dd/MM/yyyy')
        }`
      : 'Período:,Início a Fim'

    const csvContent = [
      `Conta:,${accountInfo.codigo} - ${accountInfo.descricao}`,
      dateStr,
      '',
      headers.join(','),
      ...rows,
    ].join('\n')

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `razao_${accountInfo.codigo}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const dateStr = date?.from
      ? `${format(date.from, 'dd/MM/yyyy')} a ${
          date.to ? format(date.to, 'dd/MM/yyyy') : format(date.from, 'dd/MM/yyyy')
        }`
      : 'Início a Fim'

    const html = `
      <html>
        <head>
          <title>Razão Auxiliar - ${accountInfo.codigo}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f5; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .header-info { margin-bottom: 20px; line-height: 1.5; }
            h2 { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h2>Relatório de Razão Auxiliar</h2>
          <div class="header-info">
            <div><strong>Conta:</strong> ${accountInfo.codigo} - ${accountInfo.descricao}</div>
            <div><strong>Período:</strong> ${dateStr}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Histórico</th>
                <th class="text-center">D/C</th>
                <th class="text-right">Valor</th>
                <th>Comentário Auditoria</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries
                .map((row) => {
                  const comment = comments[row.id]
                  const statusStr =
                    comment?.status === 'approved'
                      ? 'Aprovado'
                      : comment?.status === 'rejected'
                        ? 'Reprovado'
                        : comment?.status === 'pending'
                          ? 'Pendente'
                          : ''
                  return `
                  <tr>
                    <td>${row.data}</td>
                    <td>${row.historico}</td>
                    <td class="text-center">${row.dc}</td>
                    <td class="text-right">${formatNum(row.valor)}</td>
                    <td>${comment?.comment || ''}</td>
                    <td>${statusStr}</td>
                  </tr>
                `
                })
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/balancete')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl font-bold text-foreground">Razão Analítico</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={exportToPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={exportToExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Empresa</span>
            <span
              className="text-sm font-semibold truncate"
              title="DISPAN DISTRIBUIDORA E COMERCIO DE PRODUTOS PARA PANIFICAÇÃO LTDA ME"
            >
              DISPAN DISTRIBUIDORA E COMERCIO DE PRODUTOS PARA PANIFICAÇÃO LTDA ME
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">CNPJ: 08.381.848/0001-10</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Conta Selecionada
            </span>
            <span className="text-sm font-semibold">
              {accountInfo.codigo} - {accountInfo.descricao}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">01/01/2015 a 31/12/2015</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Saldo Inicial
            </span>
            <span className="text-lg font-bold text-blue-600">{accountInfo.saldoInicial}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Saldo Final</span>
            <span className="text-lg font-bold text-green-600">{accountInfo.saldoFinal}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 bg-card p-4 rounded-md border shadow-sm">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[260px] justify-start text-left font-normal',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'dd/MM/y')} - {format(date.to, 'dd/MM/y')}
                  </>
                ) : (
                  format(date.from, 'dd/MM/y')
                )
              ) : (
                <span>Filtrar por período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(range) => setDate(range as DateRange)}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        <div className="relative w-full sm:flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no histórico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Tipo de Lançamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos (D/C)</SelectItem>
            <SelectItem value="D">Débito (D)</SelectItem>
            <SelectItem value="C">Crédito (C)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Status Auditoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Reprovado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="relative min-w-[1200px]">
          <TableHeader className="bg-background z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px] px-2"></TableHead>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead className="w-[100px]">Cód. Conta</TableHead>
              <TableHead className="w-[250px]">Conta</TableHead>
              <TableHead className="w-[50px] text-center">D/C</TableHead>
              <TableHead className="w-[120px] text-right">Valor</TableHead>
              <TableHead className="w-[150px] text-right">Saldo</TableHead>
              <TableHead>Histórico</TableHead>
              <TableHead className="w-[100px] text-right">Número</TableHead>
              <TableHead className="w-[80px] text-center">Auditoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  Nenhum lançamento encontrado para os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((row) => {
                const isExpanded = expandedRows.has(row.id)
                const counterparts = DATA_WITH_IDS.filter(
                  (r) => r.numero === row.numero && r.codigoConta !== row.codigoConta,
                )
                const hasComment = !!comments[row.id]

                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        'transition-colors py-1 h-10',
                        counterparts.length > 0 && 'cursor-pointer hover:bg-muted/50',
                        isExpanded && 'bg-muted/30 font-medium',
                        hasComment && 'bg-blue-50/30 dark:bg-blue-900/10',
                      )}
                      onClick={() => counterparts.length > 0 && toggleExpand(row.id)}
                    >
                      <TableCell className="px-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Expandir Detalhes"
                          disabled={counterparts.length === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpand(row.id)
                          }}
                        >
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-transform',
                              isExpanded && 'rotate-90',
                            )}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="py-2 text-sm">{row.data}</TableCell>
                      <TableCell className="py-2 text-sm font-mono">{row.codigoConta}</TableCell>
                      <TableCell className="py-2 text-sm truncate max-w-[250px]" title={row.conta}>
                        {row.conta}
                      </TableCell>
                      <TableCell className="py-2 text-sm text-center font-medium">
                        <span className={cn(row.dc === 'D' ? 'text-blue-600' : 'text-red-600')}>
                          {row.dc}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-sm text-right tabular-nums">
                        {formatNum(row.valor)}
                      </TableCell>
                      <TableCell className="py-2 text-sm text-right tabular-nums">
                        {formatNum(row.saldo)}{' '}
                        <span className="text-muted-foreground text-xs ml-1">{row.dcSaldo}</span>
                      </TableCell>
                      <TableCell
                        className="py-2 text-sm text-muted-foreground line-clamp-2 min-w-[300px]"
                        title={row.historico}
                      >
                        <HighlightedText text={row.historico} highlight={searchQuery} />
                        {hasComment && (
                          <div className="mt-1 flex flex-col items-start gap-1">
                            <div className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
                              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-1 italic">
                                {comments[row.id].comment}
                              </span>
                            </div>
                            {renderStatusBadge(comments[row.id].status)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-sm text-right font-mono text-muted-foreground">
                        {row.numero}
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

                    {isExpanded && counterparts.length > 0 && (
                      <TableRow className="bg-muted/10 border-b">
                        <TableCell colSpan={10} className="p-0">
                          <div className="pl-12 pr-4 py-4 text-sm animate-fade-in-down bg-muted/5 border-t shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.1)]">
                            <div className="font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                              <ArrowRightLeft className="w-4 h-4" /> Contrapartidas do Lançamento{' '}
                              {row.numero}
                            </div>
                            <div className="rounded-md border bg-background overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="w-[100px] h-8">Cód. Conta</TableHead>
                                    <TableHead className="h-8">Conta</TableHead>
                                    <TableHead className="w-[50px] text-center h-8">D/C</TableHead>
                                    <TableHead className="w-[120px] text-right h-8">
                                      Valor
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {counterparts.map((cp) => (
                                    <TableRow
                                      key={cp.id}
                                      className="hover:bg-transparent border-none h-8"
                                    >
                                      <TableCell className="font-mono py-2">
                                        {cp.codigoConta}
                                      </TableCell>
                                      <TableCell className="py-2 text-muted-foreground">
                                        {cp.conta}
                                      </TableCell>
                                      <TableCell className="text-center font-medium py-2">
                                        <span
                                          className={cn(
                                            cp.dc === 'D' ? 'text-blue-600' : 'text-red-600',
                                          )}
                                        >
                                          {cp.dc}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums py-2 font-medium">
                                        {formatNum(cp.valor)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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
