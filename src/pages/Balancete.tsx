import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FileText,
  Table as TableIcon,
  FileDown,
  Search,
  Filter,
  Settings2,
  X,
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
import {
  getAccountingProjects,
  getAccounts,
  getEntryItems,
  Account,
  EntryItem,
} from '@/services/accounting'
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
        if (
          a.is_group ||
          (!a.is_group && accs.some((child) => child.code.startsWith(a.code) && child.id !== a.id))
        ) {
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
    const analyticalBalances = accounts.map((acc) => {
      const accountItems = items.filter((i) => i.account_id === acc.id)
      let periodDebits = 0
      let periodCredits = 0

      accountItems.forEach((item) => {
        if (item.type === 'debit') periodDebits += item.value
        if (item.type === 'credit') periodCredits += item.value
      })

      return {
        id: acc.id,
        directDebits: periodDebits,
        directCredits: periodCredits,
      }
    })

    const getDescendantBalances = (acc: Account) => {
      const descendants = accounts.filter(
        (r) =>
          r.parent_id === acc.id ||
          (r.code !== acc.code && r.code.startsWith(acc.code + '.')) ||
          (r.code !== acc.code && r.code.startsWith(acc.code) && !acc.code.includes('.')),
      )

      let totalDebitos = analyticalBalances.find((b) => b.id === acc.id)?.directDebits || 0
      let totalCreditos = analyticalBalances.find((b) => b.id === acc.id)?.directCredits || 0

      descendants.forEach((child) => {
        const isChildAnalytical =
          !child.is_group &&
          !accounts.some(
            (r) =>
              r.parent_id === child.id ||
              (r.code !== child.code && r.code.startsWith(child.code + '.')),
          )
        if (isChildAnalytical || !child.is_group) {
          totalDebitos += analyticalBalances.find((b) => b.id === child.id)?.directDebits || 0
          totalCreditos += analyticalBalances.find((b) => b.id === child.id)?.directCredits || 0
        }
      })

      return { totalDebitos, totalCreditos }
    }

    const finalRows = accounts.map((acc) => {
      const { totalDebitos, totalCreditos } = acc.is_group
        ? getDescendantBalances(acc)
        : {
            totalDebitos: analyticalBalances.find((b) => b.id === acc.id)?.directDebits || 0,
            totalCreditos: analyticalBalances.find((b) => b.id === acc.id)?.directCredits || 0,
          }

      let finalBalance = totalDebitos - totalCreditos
      const isCreditNormal = acc.nature
        ? acc.nature === 'credit'
        : acc.type === 'liability' || acc.type === 'equity' || acc.type === 'revenue'

      if (isCreditNormal) {
        finalBalance = totalCreditos - totalDebitos
      }

      const isAnalytical = !acc.is_group && !accounts.some((r) => r.parent_id === acc.id)

      return {
        ...acc,
        nivel: acc.level || acc.code.split('.').length,
        codigo: acc.code,
        conta: acc.name,
        tipo: isAnalytical ? 'A' : 'S',
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
    return processedData.filter((row) => {
      const matchesSearch =
        row.conta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        category === 'all' || row.categoria.toLowerCase() === category.toLowerCase()
      const matchesNivel = row.nivel <= parseInt(maxNivel || '20', 10)

      let isVisible = true
      if (!matchesSearch && searchTerm === '') {
        let currentParent = row.parent_id
        while (currentParent && isVisible) {
          if (expandedGroups[currentParent] === false) {
            isVisible = false
          }
          currentParent = processedData.find((p) => p.id === currentParent)?.parent_id
        }

        if (!row.parent_id) {
          const parts = row.codigo.split('.')
          for (let i = 1; i < parts.length; i++) {
            const ancestorCode = parts.slice(0, i).join('.')
            const ancestor = processedData.find((p) => p.codigo === ancestorCode)
            if (ancestor && expandedGroups[ancestor.id] === false) {
              isVisible = false
            }
          }
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
