import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import pbInstance from '@/lib/pocketbase/client'
import type PocketBase from 'pocketbase'

interface DatabaseContextType {
  pb: PocketBase | null
  isReady: boolean
  error: Error | null
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      if (pbInstance && typeof pbInstance.collection === 'function') {
        setIsReady(true)
      } else {
        throw new Error('PocketBase client failed to initialize')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown database initialization error'))
    }
  }, [])

  return (
    <DatabaseContext.Provider value={{ pb: isReady ? pbInstance : null, isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}
