import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FileText,
  Table as TableIcon,
  FileDown,
  Search,
  Filter,
  Loader2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAccounts, getEntryItems, Account, EntryItem } from '@/services/accounting'
import { useRealtime } from '@/hooks/use-realtime'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export default function Balancete() {
  const navigate = useNavigate()
  const { projectId } = useParams()

  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const [category, setCategory] = useState<string>('all')
  const deferredCategory = useDeferredValue(category)

  const [maxNivel, setMaxNivel] = useState('20')
  const deferredMaxNivel = useDeferredValue(maxNivel)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<EntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // Virtualization constants and state
  const ROW_HEIGHT = 40
  const MathMax = Math.max
  const MathMin = Math.min
  const OVERSCAN = 15

  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerHeight(entries[0].contentRect.height)
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const loadData = async (id: string) => {
    setLoading(true)
    try {
      const [accs, entryItems] = await Promise.all([getAccounts(id), getEntryItems(id)])
      setAccounts(accs)
      setItems(entryItems)

      const initialExpanded: Record<string, boolean> = {}
      accs.forEach((a) => {
        if (a.is_group || (a.level && a.level <= 3)) {
          initialExpanded[a.id] = true
        }
      })
      setExpandedGroups(initialExpanded)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadData(projectId)
    }
  }, [projectId])

  useRealtime('accounts', () => {
    if (projectId) loadData(projectId)
  })
  useRealtime('entry_items', () => {
    if (projectId) loadData(projectId)
  })
  useRealtime('journal_entries', () => {
    if (projectId) loadData(projectId)
  })

  const toggleGroup = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const { processedData, parentMap } = useMemo(() => {
    const analyticalBalances = new Map<
      string,
      { saldoInicial: number; debits: number; credits: number }
    >()
    accounts.forEach((acc) =>
      analyticalBalances.set(acc.id, { saldoInicial: 0, debits: 0, credits: 0 }),
    )

    items.forEach((item) => {
      const accBal = analyticalBalances.get(item.account_id)
      if (accBal) {
        if (item.type === 'debit') accBal.debits += item.value
        if (item.type === 'credit') accBal.credits += item.value
      }
    })

    const accountsByLevel = [...accounts].sort((a, b) => (b.level || 0) - (a.level || 0))
    const finalBalances = new Map<
      string,
      { saldoInicial: number; debits: number; credits: number }
    >()

    accounts.forEach((acc) => {
      finalBalances.set(acc.id, { ...analyticalBalances.get(acc.id)! })
    })

    accountsByLevel.forEach((acc) => {
      if (acc.parent_id) {
        const parentBal = finalBalances.get(acc.parent_id)
        const myBal = finalBalances.get(acc.id)
        if (parentBal && myBal) {
          parentBal.saldoInicial += myBal.saldoInicial
          parentBal.debits += myBal.debits
          parentBal.credits += myBal.credits
        }
      }
    })

    const finalRows = accounts.map((acc) => {
      const bal = finalBalances.get(acc.id)!
      const totalDebitos = bal.debits
      const totalCreditos = bal.credits
      const saldoInicial = bal.saldoInicial

      let balanceValue = totalDebitos - totalCreditos

      let dcFinal = balanceValue > 0 ? 'D' : balanceValue < 0 ? 'C' : ''
      let finalBalance = Math.abs(balanceValue)

      return {
        ...acc,
        nivel: acc.level || 1,
        codigo: acc.code,
        conta: acc.name,
        tipo: acc.is_group ? 'S' : 'A',
        saldoInicial: Math.abs(saldoInicial),
        dcInicial: saldoInicial > 0 ? 'D' : saldoInicial < 0 ? 'C' : '',
        totalDebitos,
        totalCreditos,
        saldoFinal: finalBalance,
        dcFinal,
        categoria: acc.type,
      }
    })

    const sortedData = finalRows.sort((a, b) => a.codigo.localeCompare(b.codigo))
    const pMap = new Map(sortedData.map((d) => [d.id, d.parent_id]))

    return { processedData: sortedData, parentMap: pMap }
  }, [accounts, items])

  const filteredData = useMemo(() => {
    return processedData.filter((row) => {
      const matchesSearch =
        row.conta.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        row.codigo.toLowerCase().includes(deferredSearchTerm.toLowerCase())
      const matchesCategory =
        deferredCategory === 'all' || row.categoria.toLowerCase() === deferredCategory.toLowerCase()
      const matchesNivel = row.nivel <= parseInt(deferredMaxNivel || '20', 10)

      let isVisible = true
      if (!matchesSearch && deferredSearchTerm === '') {
        let curr = row.parent_id
        while (curr) {
          if (expandedGroups[curr] === false) {
            isVisible = false
            break
          }
          curr = parentMap.get(curr)
        }
      }

      return matchesSearch && matchesCategory && matchesNivel && isVisible
    })
  }, [
    processedData,
    parentMap,
    deferredSearchTerm,
    deferredCategory,
    deferredMaxNivel,
    expandedGroups,
  ])

  const getRowStyle = (nivel: number, tipo: string) => {
    if (nivel === 1) return 'bg-primary/10 text-primary font-bold hover:bg-primary/20'
    if (nivel === 2) return 'bg-muted/60 font-semibold'
    if (nivel === 3) return 'bg-muted/30 font-medium'
    if (tipo === 'S') return 'font-medium'
    return ''
  }

  const startIndex = MathMax(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = MathMin(
    filteredData.length - 1,
    Math.floor((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
  )

  const visibleRows = filteredData.slice(startIndex, endIndex + 1)
  const topSpacerHeight = startIndex * ROW_HEIGHT
  const bottomSpacerHeight = MathMax(0, (filteredData.length - 1 - endIndex) * ROW_HEIGHT)

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 rounded-lg border shadow-sm gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-foreground">Balancete Hierárquico</h2>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportar PDF">
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600"
              title="Exportar Excel"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportar TXT">
              <FileDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Níveis:</span>
            <Input
              type="number"
              value={maxNivel}
              onChange={(e) => setMaxNivel(e.target.value)}
              className="w-16 h-8 text-center"
              min="1"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou conta..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              <SelectItem value="asset">Ativo</SelectItem>
              <SelectItem value="liability">Passivo</SelectItem>
              <SelectItem value="equity">Patrimônio Líquido</SelectItem>
              <SelectItem value="revenue">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="rounded-md border bg-card flex-1 overflow-auto relative"
      >
        <Table className="relative min-w-[1000px] w-full">
          <TableHeader className="sticky top-0 bg-background z-20 shadow-sm border-b">
            <TableRow>
              <TableHead className="w-16">Nível</TableHead>
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="w-16 text-center">Tipo</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead className="w-12 text-center">D/C</TableHead>
              <TableHead className="text-right">Total Débitos</TableHead>
              <TableHead className="text-right">Total Créditos</TableHead>
              <TableHead className="text-right">Saldo Final</TableHead>
              <TableHead className="w-12 text-center">D/C</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando dados financeiros...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  Nenhum dado financeiro encontrado para este projeto.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {topSpacerHeight > 0 && (
                  <tr style={{ height: topSpacerHeight }}>
                    <td colSpan={10} className="p-0 border-0" />
                  </tr>
                )}
                {visibleRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-muted/80',
                      getRowStyle(row.nivel, row.tipo),
                    )}
                    style={{ height: ROW_HEIGHT }}
                    onClick={(e) =>
                      row.tipo === 'A'
                        ? navigate(`/projects/${projectId}/accounts/${row.id}/ledger`)
                        : toggleGroup(row.id, e)
                    }
                  >
                    <TableCell className="h-[40px] py-0 align-middle">{row.nivel}</TableCell>
                    <TableCell className="h-[40px] py-0 align-middle font-mono text-xs">
                      {row.codigo}
                    </TableCell>
                    <TableCell
                      className="h-[40px] py-0 align-middle truncate max-w-[300px]"
                      title={row.conta}
                    >
                      <div
                        className="flex items-center gap-1"
                        style={{ paddingLeft: `${(row.nivel - 1) * 12}px` }}
                      >
                        {row.tipo === 'S' ? (
                          <div
                            onClick={(e) => toggleGroup(row.id, e)}
                            className="p-0.5 hover:bg-muted rounded cursor-pointer"
                          >
                            {expandedGroups[row.id] ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                          </div>
                        ) : (
                          <div className="w-5 shrink-0" />
                        )}
                        <span className="truncate">{row.conta}</span>
                      </div>
                    </TableCell>
                    <TableCell className="h-[40px] py-0 align-middle text-center">
                      {row.tipo}
                    </TableCell>
                    <TableCell className="h-[40px] py-0 align-middle text-right tabular-nums">
                      {formatNum(row.saldoInicial)}
                    </TableCell>
                    <TableCell className="h-[40px] py-0 align-middle text-center">
                      {row.dcInicial}
                    </TableCell>
                    <TableCell className="h-[40px] py-0 align-middle text-right tabular-nums">
                      {formatNum(row.totalDebitos)}
                    </TableCell>
                    <TableCell className="h-[40px] py-0 align-middle text-right tabular-nums">
                      {formatNum(row.totalCreditos)}
                    </TableCell>
                    <TableCell className="h-[40px] py-0 align-middle text-right tabular-nums">
                      {formatNum(row.saldoFinal)}
                    </TableCell>
                    <TableCell className="h-[40px] py-0 align-middle text-center">
                      {row.dcFinal}
                    </TableCell>
                  </TableRow>
                ))}
                {bottomSpacerHeight > 0 && (
                  <tr style={{ height: bottomSpacerHeight }}>
                    <td colSpan={10} className="p-0 border-0" />
                  </tr>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
