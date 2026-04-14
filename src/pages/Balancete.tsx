import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Table as TableIcon,
  FileDown,
  Search,
  Filter,
  Settings2,
  X,
  Loader2,
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
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [maxNivel, setMaxNivel] = useState('20')

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<EntryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAccountingProjects()
      .then((data) => {
        setProjects(data)
        if (data.length > 0) {
          setSelectedProjectId(data[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  const loadData = async (projectId: string) => {
    setLoading(true)
    try {
      const [accs, entryItems] = await Promise.all([
        getAccounts(projectId),
        getEntryItems(projectId),
      ])
      setAccounts(accs)
      setItems(entryItems)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedProjectId) {
      loadData(selectedProjectId)
    }
  }, [selectedProjectId])

  useRealtime('accounts', () => {
    if (selectedProjectId) loadData(selectedProjectId)
  })
  useRealtime('entry_items', () => {
    if (selectedProjectId) loadData(selectedProjectId)
  })
  useRealtime('journal_entries', () => {
    if (selectedProjectId) loadData(selectedProjectId)
  })

  const processedData = useMemo(() => {
    const rows = accounts.map((acc) => {
      const accountItems = items.filter((i) => i.account_id === acc.id)
      let periodDebits = 0
      let periodCredits = 0

      accountItems.forEach((item) => {
        if (item.type === 'debit') periodDebits += item.value
        if (item.type === 'credit') periodCredits += item.value
      })

      return {
        ...acc,
        directDebits: periodDebits,
        directCredits: periodCredits,
      }
    })

    const finalRows = rows.map((acc) => {
      const children = rows.filter((r) => r.code.startsWith(acc.code))

      let totalDebitos = 0
      let totalCreditos = 0

      children.forEach((child) => {
        totalDebitos += child.directDebits
        totalCreditos += child.directCredits
      })

      let finalBalance = totalDebitos - totalCreditos
      const isCreditNormal =
        acc.type === 'liability' || acc.type === 'equity' || acc.type === 'revenue'

      if (isCreditNormal) {
        finalBalance = totalCreditos - totalDebitos
      }

      const isAnalytical = !rows.some((r) => r.code !== acc.code && r.code.startsWith(acc.code))

      return {
        id: acc.id,
        nivel: acc.code.split('.').length,
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

    return finalRows
  }, [accounts, items])

  const filteredData = useMemo(() => {
    return processedData.filter((row) => {
      const matchesSearch =
        row.conta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        category === 'all' || row.categoria.toLowerCase() === category.toLowerCase()
      const matchesNivel = row.nivel <= parseInt(maxNivel || '20', 10)
      return matchesSearch && matchesCategory && matchesNivel
    })
  }, [processedData, searchTerm, category, maxNivel])

  const getRowStyle = (nivel: number, tipo: string) => {
    if (nivel === 1) return 'bg-primary text-primary-foreground font-bold hover:bg-primary/90'
    if (nivel === 2) return 'bg-muted font-semibold'
    if (nivel === 3) return 'bg-muted/50 font-medium'
    if (tipo === 'S') return 'font-medium'
    return ''
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 rounded-lg border shadow-sm gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-foreground">Balancete</h2>
          {projects.length > 0 && (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[280px] h-8 font-semibold">
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <span className="text-sm whitespace-nowrap hidden md:inline">Período Completo</span>
            <Button variant="outline" size="sm" className="h-8 whitespace-nowrap">
              Alterar
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
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

      {/* Main Table Area */}
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
                    navigate(`/projects/${selectedProjectId}/accounts/${row.id}/ledger`)
                  }
                >
                  <TableCell className="py-2">{row.nivel}</TableCell>
                  <TableCell className="py-2 font-mono text-xs">{row.codigo}</TableCell>
                  <TableCell className="py-2 truncate max-w-[300px]" title={row.conta}>
                    <span style={{ paddingLeft: `${(row.nivel - 1) * 12}px` }}>{row.conta}</span>
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
