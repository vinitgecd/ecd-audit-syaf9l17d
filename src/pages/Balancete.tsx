import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDatabase } from '@/contexts/DatabaseContext'
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
import { ImportHistory } from '@/components/ImportHistory'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export default function Balancete() {
  const navigate = useNavigate()
  const { projectId } = useParams()

  const {
    loading,
    isProcessing,
    error,
    loadBalancete,
    resetProject,
    processedBalancete,
    expandedGroups,
    setExpandedGroups,
    loadChildren,
    loadedChildren,
    progressText,
    isBackgroundLoading,
    isTimeout,
  } = useAccountingStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [maxNivel, setMaxNivel] = useState('5')
  const [debouncedNivel, setDebouncedNivel] = useState('5')
  const [childLoadingId, setChildLoadingId] = useState<string | null>(null)
  const { isReady } = useDatabase()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setDebouncedNivel(maxNivel)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, maxNivel])

  const ROW_HEIGHT = 40
  const OVERSCAN = 15
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) setContainerHeight(entries[0].contentRect.height)
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  useEffect(() => {
    if (projectId && isReady) {
      loadBalancete(projectId, 0, debouncedSearch)
    }
  }, [projectId, debouncedSearch, loadBalancete, isReady])

  const toggleGroup = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!expandedGroups[id] && !loadedChildren[id] && projectId) {
        setChildLoadingId(id)
        await loadChildren(projectId, id)
        setChildLoadingId(null)
      }
      setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
    },
    [setExpandedGroups, expandedGroups, loadedChildren, projectId, loadChildren],
  )

  const isLoadingData = loading || isProcessing
  const [showSlowWarning, setShowSlowWarning] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isLoadingData) {
      setShowSlowWarning(false)
      timer = setTimeout(() => setShowSlowWarning(true), 2000)
    } else {
      setShowSlowWarning(false)
    }
    return () => clearTimeout(timer)
  }, [isLoadingData])

  const processedData = processedBalancete?.data || []
  const parentMap = processedBalancete?.parentMap || new Map<string, string | undefined>()

  const filteredData = useMemo(() => {
    const maxLevel = parseInt(debouncedNivel || '5', 10)
    return processedData.filter((row) => {
      const matchesCategory =
        category === 'all' || row.categoria.toLowerCase() === category.toLowerCase()
      const matchesLevel = row.nivel <= maxLevel
      let isVisible = true
      if (!debouncedSearch) {
        let curr = row.parent_id
        while (curr) {
          if (expandedGroups[curr] === false) {
            isVisible = false
            break
          }
          curr = parentMap.get(curr)
        }
      }
      return matchesCategory && isVisible && matchesLevel
    })
  }, [processedData, parentMap, debouncedSearch, category, expandedGroups, debouncedNivel])

  const getRowStyle = (nivel: number, tipo: string) => {
    if (nivel === 1) return 'bg-primary/10 text-primary font-bold hover:bg-primary/20'
    if (nivel === 2) return 'bg-muted/60 font-semibold'
    if (nivel === 3) return 'bg-muted/30 font-medium'
    if (tipo === 'S') return 'font-medium'
    return ''
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(
    filteredData.length - 1,
    Math.floor((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
  )
  const visibleRows = filteredData.slice(startIndex, endIndex + 1)
  const topSpacerHeight = startIndex * ROW_HEIGHT
  const bottomSpacerHeight = Math.max(0, (filteredData.length - 1 - endIndex) * ROW_HEIGHT)

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

      <div className="flex gap-4 items-center flex-wrap">
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

      {(isTimeout || isBackgroundLoading) && (
        <div
          className={cn(
            'border rounded-md p-3 flex items-center gap-2',
            isTimeout ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200',
          )}
        >
          {isTimeout ? (
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          ) : (
            <Loader2 className="h-5 w-5 text-blue-600 shrink-0 animate-spin" />
          )}
          <p className={cn('text-sm', isTimeout ? 'text-amber-800' : 'text-blue-800')}>
            {isTimeout
              ? 'O carregamento está demorando. Dados parciais carregados. Aguarde...'
              : progressText || 'Carregando registros restantes...'}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
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
              {isLoadingData && processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-lg font-medium text-foreground">
                        {progressText || 'Buscando dados no servidor...'}
                      </p>
                      {showSlowWarning ? (
                        <p className="text-sm font-medium text-amber-600 animate-pulse bg-amber-50 p-2 rounded-md max-w-md mx-auto">
                          Processando arquivo grande, por favor aguarde... Isso pode levar alguns
                          minutos dependendo do tamanho da sua ECD.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aguardando resposta do servidor
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : error && !isTimeout ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-4">
                      <p className="text-destructive font-medium">
                        Erro ao carregar dados financeiros.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => projectId && loadBalancete(projectId, 0, debouncedSearch)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tentar Novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : processedData.length === 0 && !debouncedSearch ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-8">
                      <FileText className="h-12 w-12 text-muted-foreground/50" />
                      <p className="font-medium text-lg">Balancete Vazio</p>
                      <p className="text-sm">
                        Nenhum dado financeiro encontrado para este projeto. Importe o arquivo do
                        SPED ECD para visualizar o balancete.
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
                          ? navigate(`/projects/${projectId}/razao/${row.id}`)
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
                              {childLoadingId === row.id ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              ) : expandedGroups[row.id] ? (
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
        {projectId && <ImportHistory projectId={projectId} />}
      </div>
    </div>
  )
}
