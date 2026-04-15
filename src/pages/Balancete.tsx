import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FileText,
  Table as TableIcon,
  FileDown,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Trash2,
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
import useAccountingStore from '@/stores/useAccountingStore'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export default function Balancete() {
  const navigate = useNavigate()
  const { projectId } = useParams()

  const {
    accounts,
    loading,
    isProcessing,
    error,
    loadData,
    processedBalancete,
    expandedGroups,
    setExpandedGroups,
  } = useAccountingStore()

  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const [category, setCategory] = useState<string>('all')
  const deferredCategory = useDeferredValue(category)

  const [maxNivel, setMaxNivel] = useState('20')
  const deferredMaxNivel = useDeferredValue(maxNivel)

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

  useEffect(() => {
    if (projectId) {
      loadData(projectId)
    }
  }, [projectId, loadData])

  const toggleGroup = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
    },
    [setExpandedGroups],
  )

  const isLoadingData = loading || isProcessing
  const [showSlowWarning, setShowSlowWarning] = useState(false)
  const [hasTimeout, setHasTimeout] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    let timeoutTimer: NodeJS.Timeout

    if (isLoadingData) {
      setShowSlowWarning(false)
      setHasTimeout(false)
      timer = setTimeout(() => setShowSlowWarning(true), 2000)
      timeoutTimer = setTimeout(() => setHasTimeout(true), 15000)
    } else {
      setShowSlowWarning(false)
      setHasTimeout(false)
    }
    return () => {
      clearTimeout(timer)
      clearTimeout(timeoutTimer)
    }
  }, [isLoadingData])

  const processedData = processedBalancete?.data || []
  const parentMap = processedBalancete?.parentMap || new Map<string, string | undefined>()

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
            {hasTimeout ? (
              <TableRow>
                <TableCell colSpan={10} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <p className="text-lg font-medium text-foreground">
                      O carregamento dos dados está demorando muito.
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Isso pode acontecer com projetos com um grande volume de dados. Você pode
                      tentar carregar novamente ou ir para as configurações para limpar os dados se
                      o problema persistir.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Button
                        variant="outline"
                        onClick={() => projectId && loadData(projectId, true)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tentar Novamente
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => navigate(`/projects/${projectId}/settings`)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Resetar Projeto
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoadingData ? (
              <TableRow>
                <TableCell colSpan={10} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-lg font-medium text-foreground">
                      {loading
                        ? 'Buscando dados no servidor...'
                        : 'Processando árvore do balancete...'}
                    </p>
                    {showSlowWarning ? (
                      <p className="text-sm font-medium text-amber-600 animate-pulse bg-amber-50 p-2 rounded-md max-w-md mx-auto">
                        Processando arquivo grande, por favor aguarde... Isso pode levar alguns
                        minutos dependendo do tamanho da sua ECD.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {loading
                          ? 'Aguardando resposta do servidor'
                          : 'Calculando totais e totalizadores'}
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <p className="text-destructive font-medium">
                      Erro ao carregar dados financeiros.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => projectId && loadData(projectId, true)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tentar Novamente
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-8">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p className="font-medium text-lg">Balancete Vazio</p>
                    <p className="text-sm">
                      Nenhum dado financeiro encontrado para este projeto. Importe o arquivo do SPED
                      ECD para visualizar o balancete.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  Nenhum resultado encontrado para os filtros aplicados.
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
