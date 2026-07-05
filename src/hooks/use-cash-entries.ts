import { useState, useEffect, useCallback } from 'react'
import {
  getCashEntriesPaginated,
  getAccounts,
  type Account,
  type EntryItem,
} from '@/services/accounting'

export interface CashEntryFilters {
  accountId: string | null
  search: string
  startDate: string
  endDate: string
}

const DEFAULT_FILTERS: CashEntryFilters = {
  accountId: null,
  search: '',
  startDate: '',
  endDate: '',
}

export function useCashEntries(projectId: string, perPage: number = 50) {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<EntryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filters, setFilters] = useState<CashEntryFilters>(DEFAULT_FILTERS)

  const loadAccounts = useCallback(async () => {
    if (!projectId) return
    try {
      const accs = await getAccounts(projectId)
      setAccounts(accs)
    } catch (e) {
      console.error('Failed to load accounts:', e)
    }
  }, [projectId])

  const loadData = useCallback(async () => {
    if (!projectId) {
      setItems([])
      setTotalItems(0)
      setTotalPages(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await getCashEntriesPaginated(projectId, page, perPage, {
        accountId: filters.accountId,
        search: filters.search || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      })
      setItems(result.items as EntryItem[])
      setTotalItems(result.totalItems)
      setTotalPages(result.totalPages)
    } catch (e) {
      console.error('Failed to load cash entries:', e)
      setItems([])
      setTotalItems(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [
    projectId,
    page,
    perPage,
    filters.accountId,
    filters.search,
    filters.startDate,
    filters.endDate,
  ])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refetch = useCallback(() => {
    loadData()
  }, [loadData])

  const updateFilters = useCallback((newFilters: Partial<CashEntryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPage(1)
  }, [])

  const nextPage = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages])
  const prevPage = useCallback(() => setPage((p) => Math.max(p - 1, 1)), [])
  const goToPage = useCallback(
    (p: number) => setPage(Math.min(Math.max(p, 1), totalPages)),
    [totalPages],
  )

  return {
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
  }
}
