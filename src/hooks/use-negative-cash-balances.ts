import { useState, useEffect, useCallback, useMemo } from 'react'
import { getNegativeCashBalanceEntries, type CashBalanceEntry } from '@/services/presuncoes'

export interface NegativeCashFilters {
  search: string
  startDate: string
  endDate: string
}

const DEFAULT_FILTERS: NegativeCashFilters = {
  search: '',
  startDate: '',
  endDate: '',
}

export function useNegativeCashBalances(projectId: string, perPage: number = 50) {
  const [allEntries, setAllEntries] = useState<CashBalanceEntry[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<NegativeCashFilters>(DEFAULT_FILTERS)

  const loadData = useCallback(async () => {
    if (!projectId) {
      setAllEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 60000)
      })
      const entries = (await Promise.race([
        getNegativeCashBalanceEntries(projectId),
        timeoutPromise,
      ])) as CashBalanceEntry[]
      setAllEntries(entries)
    } catch (e) {
      console.error('Failed to load negative cash balance entries:', e)
      setAllEntries([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refetch = useCallback(() => {
    loadData()
  }, [loadData])

  const filteredEntries = useMemo(() => {
    let result = allEntries
    if (filters.search) {
      const s = filters.search.toLowerCase()
      result = result.filter(
        (e) =>
          (e.entryDescription && e.entryDescription.toLowerCase().includes(s)) ||
          (e.entryReference && e.entryReference.toLowerCase().includes(s)) ||
          (e.accountCode && e.accountCode.toLowerCase().includes(s)) ||
          (e.accountName && e.accountName.toLowerCase().includes(s)),
      )
    }
    if (filters.startDate) {
      result = result.filter((e) => e.entryDate.split(' ')[0] >= filters.startDate)
    }
    if (filters.endDate) {
      result = result.filter((e) => e.entryDate.split(' ')[0] <= filters.endDate)
    }
    return result
  }, [allEntries, filters.search, filters.startDate, filters.endDate])

  const totalItems = filteredEntries.length
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const currentPage = Math.min(page, totalPages)

  const items = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filteredEntries.slice(start, start + perPage)
  }, [filteredEntries, currentPage, perPage])

  const updateFilters = useCallback((newFilters: Partial<NegativeCashFilters>) => {
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
    page: currentPage,
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
