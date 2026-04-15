import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Account, EntryItem, getAccounts, getEntryItems } from '@/services/accounting'
import { useRealtime } from '@/hooks/use-realtime'

interface AccountingState {
  projectId: string | null
  accounts: Account[]
  items: EntryItem[]
  loading: boolean
  hasLoaded: boolean
  error: Error | null
  loadData: (projectId: string, force?: boolean) => Promise<void>
}

const AccountingContext = createContext<AccountingState | undefined>(undefined)

export const AccountingProvider = ({ children }: { children: ReactNode }) => {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<EntryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(
    async (id: string, force = false) => {
      if (!force && id === projectId && hasLoaded && !error) return

      setLoading(true)
      setError(null)
      try {
        const [accs, entryItems] = await Promise.all([getAccounts(id), getEntryItems(id)])
        setAccounts(accs)
        setItems(entryItems)
        setProjectId(id)
        setHasLoaded(true)
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e : new Error('Failed to load accounting data'))
      } finally {
        setLoading(false)
      }
    },
    [projectId, error, hasLoaded],
  )

  useRealtime(
    'accounts',
    () => {
      if (projectId) loadData(projectId, true)
    },
    !!projectId,
  )

  useRealtime(
    'entry_items',
    () => {
      if (projectId) loadData(projectId, true)
    },
    !!projectId,
  )

  useRealtime(
    'journal_entries',
    () => {
      if (projectId) loadData(projectId, true)
    },
    !!projectId,
  )

  return React.createElement(
    AccountingContext.Provider,
    {
      value: { projectId, accounts, items, loading, hasLoaded, error, loadData },
    },
    children,
  )
}

export default function useAccountingStore() {
  const context = useContext(AccountingContext)
  if (!context) throw new Error('useAccountingStore must be used within AccountingProvider')
  return context
}
