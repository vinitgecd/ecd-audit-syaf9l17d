import { Fragment, useState, useMemo } from 'react'
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
import { cn } from '@/lib/utils'

type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

const parseDateStr = (dateStr: string) => parse(dateStr, 'dd/MM/yyyy', new Date())

const MOCK_RAZAO_DATA = [
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'D',
    valor: 20.0,
    saldo: 11276.49,
    dcSaldo: 'D',
    historico:
      'Valor ref.receb juros(oobs)dupl: 11359 -Panificadora Monte Castelo conf. financeiro filial: CP',
    numero: '1306',
  },
  {
    data: '07/01/2015',
    codigoConta: '1332',
    conta: 'JUROS OBTIDOS',
    dc: 'C',
    valor: 20.0,
    saldo: 11276.49,
    dcSaldo: 'D',
    historico:
      'Valor ref.receb juros(oobs)dupl: 11359 -Panificadora Monte Castelo conf. financeiro filial: CP',
    numero: '1306',
  },
  {
    data: '07/01/2015',
    codigoConta: '710',
    conta: 'LANCHES E REFEIÇÕES',
    dc: 'D',
    valor: 60.0,
    saldo: 11216.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Lanches e refeicoes - motoristas rota barauna-conf. financeiro filial: CP',
    numero: '1308',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 60.0,
    saldo: 11216.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Lanches e refeicoes - motoristas rota barauna-conf. financeiro filial: CP',
    numero: '1308',
  },
  {
    data: '07/01/2015',
    codigoConta: '1350',
    conta: 'TRANSPORTE DE MERCADORIAS',
    dc: 'D',
    valor: 20.0,
    saldo: 11196.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Gorjeta/enlonamento moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1310',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 20.0,
    saldo: 11196.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Gorjeta/enlonamento moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1310',
  },
  {
    data: '07/01/2015',
    codigoConta: '1242',
    conta: 'OMEGA DISTRIBUIDORA DE BATERIAS LTDA',
    dc: 'D',
    valor: 1100.0,
    saldo: 10096.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. 1620 - mys 5566 02 baterias omega nf 16449-conf. financeiro filial: Natal',
    numero: '1314',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 1100.0,
    saldo: 10096.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. 1620 - mys 5566 02 baterias omega nf 16449-conf. financeiro filial: Natal',
    numero: '1314',
  },
  {
    data: '07/01/2015',
    codigoConta: '710',
    conta: 'LANCHES E REFEIÇÕES',
    dc: 'D',
    valor: 39.0,
    saldo: 10057.49,
    dcSaldo: 'D',
    historico:
      'Pg. ref. Lanches e refeicoes - motoristas moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1319',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 39.0,
    saldo: 10057.49,
    dcSaldo: 'D',
    historico:
      'Pg. ref. Lanches e refeicoes - motoristas moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1319',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'D',
    valor: 1.77,
    saldo: 10059.26,
    dcSaldo: 'D',
    historico:
      'Valor ref juros na baixa duplic. 55738-18-Eugenio Tavares De Barros conf. financeiro filial: NATAL',
    numero: '1324',
  },
]

const DATA_WITH_IDS = MOCK_RAZAO_DATA.map((row, idx) => ({ ...row, id: String(idx) }))

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

  const [date, setDate] = useState<DateRange | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const accountInfo = {
    codigo: accountId || '5',
    descricao: 'CAIXA GERAL',
    saldoInicial: '11.256,49 D',
    saldoFinal: '10.059,26 D',
  }

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

    return entries
  }, [accountInfo.codigo, date, searchQuery, typeFilter])

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/balancete')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl font-bold text-foreground">Razão Analítico</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <FileDown className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Account Summary Panel */}
      <Card className="shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Empresa</span>
            <span
              className="text-sm font-semibold truncate"
              title="DISPAN DISTRIBUIDORA E COMERCIO DE PRODUTOS PARA PANIFICAÇÃO LTDA ME"
            >
              DISPAN DISTRIBUIDORA E COMERCIO...
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

      {/* Filters */}
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
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border bg-card flex-1 overflow-auto">
        <Table className="relative min-w-[1200px]">
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  Nenhum lançamento encontrado para os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((row) => {
                const isExpanded = expandedRows.has(row.id)
                const counterparts = DATA_WITH_IDS.filter(
                  (r) => r.numero === row.numero && r.codigoConta !== row.codigoConta,
                )

                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        'transition-colors py-1 h-10',
                        counterparts.length > 0 && 'cursor-pointer hover:bg-muted/50',
                        isExpanded && 'bg-muted/30 font-medium',
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
                      </TableCell>
                      <TableCell className="py-2 text-sm text-right font-mono text-muted-foreground">
                        {row.numero}
                      </TableCell>
                    </TableRow>

                    {isExpanded && counterparts.length > 0 && (
                      <TableRow className="bg-muted/10 border-b">
                        <TableCell colSpan={9} className="p-0">
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
    </div>
  )
}
