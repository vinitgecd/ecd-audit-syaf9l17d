import { useState, useMemo, useEffect, useCallback } from 'react'
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
  const [category, setCategory] = useState<string>('all')
  const [maxNivel, setMaxNivel] = useState('20')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<EntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const loadData = async (id: string) => {
    setLoading(true)
    try {
      const [accs, entryItems] = await Promise.all([getAccounts(id), getEntryItems(id)])
      setAccounts(accs)
      setItems(entryItems)

      const initialExpanded: Record<string, boolean> = {}
      accs.forEach((a) => {
        if (a.is_group || a.level! <= 3) {
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

  const processedData = useMemo(() => {
    const analyticalBalances = new Map<string, { debits: number; credits: number }>()
    accounts.forEach((acc) => analyticalBalances.set(acc.id, { debits: 0, credits: 0 }))

    items.forEach((item) => {
      const accBal = analyticalBalances.get(item.account_id)
      if (accBal) {
        if (item.type === 'debit') accBal.debits += item.value
        if (item.type === 'credit') accBal.credits += item.value
      }
    })

    const accountsByLevel = [...accounts].sort((a, b) => (b.level || 0) - (a.level || 0))
    const finalBalances = new Map<string, { debits: number; credits: number }>()

    accounts.forEach((acc) => {
      finalBalances.set(acc.id, { ...analyticalBalances.get(acc.id)! })
    })

    accountsByLevel.forEach((acc) => {
      if (acc.parent_id) {
        const parentBal = finalBalances.get(acc.parent_id)
        const myBal = finalBalances.get(acc.id)
        if (parentBal && myBal) {
          parentBal.debits += myBal.debits
          parentBal.credits += myBal.credits
        }
      }
    })

    const finalRows = accounts.map((acc) => {
      const bal = finalBalances.get(acc.id)!
      const totalDebitos = bal.debits
      const totalCreditos = bal.credits

      let finalBalance = totalDebitos - totalCreditos
      const isCreditNormal =
        acc.type === 'liability' || acc.type === 'equity' || acc.type === 'revenue'

      if (isCreditNormal) {
        finalBalance = totalCreditos - totalDebitos
      }

      return {
        ...acc,
        nivel: acc.level || 1,
        codigo: acc.code,
        conta: acc.name,
        tipo: acc.is_group ? 'S' : 'A',
        saldoInicial: 0,
        dcInicial: '',
        totalDebitos,
        totalCreditos,
        saldoFinal: Math.abs(finalBalance),
        dcFinal:
          finalBalance === 0
            ? ''
            : isCreditNormal
              ? finalBalance > 0
                ? 'C'
                : 'D'
              : finalBalance > 0
                ? 'D'
                : 'C',
        categoria: acc.type,
      }
    })

    return finalRows.sort((a, b) => a.codigo.localeCompare(b.codigo))
  }, [accounts, items])

  const filteredData = useMemo(() => {
    const parentMap = new Map(processedData.map((d) => [d.id, d.parent_id]))

    return processedData.filter((row) => {
      const matchesSearch =
        row.conta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        category === 'all' || row.categoria.toLowerCase() === category.toLowerCase()
      const matchesNivel = row.nivel <= parseInt(maxNivel || '20', 10)

      let isVisible = true
      if (!matchesSearch && searchTerm === '') {
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
  }, [processedData, searchTerm, category, maxNivel, expandedGroups])

  const getRowStyle = (nivel: number, tipo: string) => {
    if (nivel === 1) return 'bg-primary/10 text-primary font-bold hover:bg-primary/20'
    if (nivel === 2) return 'bg-muted/60 font-semibold'
    if (nivel === 3) return 'bg-muted/30 font-medium'
    if (tipo === 'S') return 'font-medium'
    return ''
  }

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

      <div className="rounded-md border bg-card flex-1 overflow-auto">
        <Table className="relative min-w-[1000px]">
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
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
              filteredData.map((row, idx) => (
                <TableRow
                  key={`${row.codigo}-${idx}`}
                  className={cn(
                    'cursor-pointer transition-colors py-1 h-10 hover:bg-muted/80',
                    getRowStyle(row.nivel, row.tipo),
                  )}
                  onClick={() =>
                    row.tipo === 'A'
                      ? navigate(`/projects/${projectId}/accounts/${row.id}/ledger`)
                      : toggleGroup(row.id, { stopPropagation: () => {} } as any)
                  }
                >
                  <TableCell className="py-2">{row.nivel}</TableCell>
                  <TableCell className="py-2 font-mono text-xs">{row.codigo}</TableCell>
                  <TableCell className="py-2 truncate max-w-[300px]" title={row.conta}>
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
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      ) : (
                        <div className="w-5" />
                      )}
                      <span>{row.conta}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-center">{row.tipo}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.saldoInicial)}
                  </TableCell>
                  <TableCell className="py-2 text-center">{row.dcInicial}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.totalDebitos)}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.totalCreditos)}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.saldoFinal)}
                  </TableCell>
                  <TableCell className="py-2 text-center">{row.dcFinal}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
