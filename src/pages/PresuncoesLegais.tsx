import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useCashEntries } from '@/hooks/use-cash-entries'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search, Wallet, FileSearch, X } from 'lucide-react'

const PER_PAGE = 50

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const fmtDate = (d: string) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function getPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

export default function PresuncoesLegais() {
  const { projectId } = useParams<{ projectId: string }>()
  const {
    items,
    accounts,
    page,
    totalPages,
    totalItems,
    loading,
    filters,
    updateFilters,
    nextPage,
    prevPage,
    goToPage,
    refetch,
  } = useCashEntries(projectId || '', PER_PAGE)

  const [searchInput, setSearchInput] = useState(filters.search)

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        updateFilters({ search: searchInput })
      }
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  useRealtime('entry_items', () => refetch())
  useRealtime('journal_entries', () => refetch())

  const totalDebit = items.reduce((s, i) => s + (i.type === 'debit' ? i.value : 0), 0)
  const totalCredit = items.reduce((s, i) => s + (i.type === 'credit' ? i.value : 0), 0)
  const hasFilters = filters.accountId || filters.search || filters.startDate || filters.endDate

  const clearFilters = () => {
    updateFilters({
      accountId: null,
      search: '',
      startDate: '',
      endDate: '',
    })
  }

  if (!projectId) return null

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presunções Legais</h1>
          <p className="text-sm text-muted-foreground">Análise do Saldo Credor de Caixa</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSearch className="h-5 w-5" />
            Saldo Credor de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Conta</label>
              <Select
                value={filters.accountId || 'all'}
                onValueChange={(v) =>
                  updateFilters({
                    accountId: v === 'all' ? null : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data Início</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilters({ startDate: e.target.value })}
                className="w-[160px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilters({ endDate: e.target.value })}
                className="w-[160px]"
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Buscar Histórico</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descrição ou referência..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" /> Limpar
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead className="w-[120px]">Referência</TableHead>
                  <TableHead className="w-[180px]">Conta</TableHead>
                  <TableHead className="w-[140px] text-right">Débito</TableHead>
                  <TableHead className="w-[140px] text-right">Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={`skel-${i}-${j}`}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileSearch className="h-10 w-10 opacity-40" />
                        <p className="text-sm">
                          {hasFilters
                            ? 'Nenhum lançamento encontrado com os filtros aplicados.'
                            : 'Nenhum lançamento encontrado. Importe os dados contábeis para visualizar.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const entry = item.expand?.entry_id
                    const account = item.expand?.account_id
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm">
                          {fmtDate(entry?.date || '')}
                        </TableCell>
                        <TableCell className="text-sm">{entry?.description || '—'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {entry?.reference || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {account ? `${account.code} — ${account.name}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.type === 'debit' ? fmtCurrency(item.value) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.type === 'credit' ? fmtCurrency(item.value) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
              {!loading && items.length > 0 && (
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={4}>Total da página</TableCell>
                    <TableCell className="text-right font-mono">
                      {fmtCurrency(totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {fmtCurrency(totalCredit)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {!loading && totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {totalItems} {totalItems === 1 ? 'registro' : 'registros'} • Página {page} de{' '}
                {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                {getPageRange(page, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={`page-${p}`}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => goToPage(p)}
                      className="min-w-[36px]"
                    >
                      {p}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={page >= totalPages}
                  className="gap-1"
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
