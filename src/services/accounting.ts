import pb from '@/lib/pocketbase/client'
import type PocketBase from 'pocketbase'

export interface AccountBalance extends Account {
  total_debits: number
  total_credits: number
}

export interface Account {
  id: string
  project_id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parent_id?: string
  level?: number
  nature?: string
  is_group?: boolean
  referential_code?: string
  created: string
  updated: string
}

export interface JournalEntry {
  id: string
  project_id: string
  date: string
  description: string
  reference: string
  created: string
  updated: string
}

export interface EntryItem {
  id: string
  entry_id: string
  account_id: string
  type: 'debit' | 'credit'
  value: number
  created: string
  updated: string
  expand?: {
    entry_id?: JournalEntry
    account_id?: Account
  }
}

const getClient = (): PocketBase => {
  if (!pb || typeof pb.collection !== 'function') {
    throw new Error('Database client not initialized or collection method missing')
  }
  return pb
}

const safeCollection = (collectionName: string) => {
  return getClient().collection(collectionName)
}

export const createAccount = async (data: Partial<Account>) => {
  try {
    return await safeCollection('accounts').create<Account>(data)
  } catch (error) {
    console.error('Error in createAccount:', error)
    throw error
  }
}

export const createJournalEntry = async (data: Partial<JournalEntry>) => {
  try {
    return await safeCollection('journal_entries').create<JournalEntry>(data)
  } catch (error) {
    console.error('Error in createJournalEntry:', error)
    throw error
  }
}

export const createEntryItem = async (data: Partial<EntryItem>) => {
  try {
    return await safeCollection('entry_items').create<EntryItem>(data)
  } catch (error) {
    console.error('Error in createEntryItem:', error)
    throw error
  }
}

export const getAccountingProjects = async () => {
  try {
    return await safeCollection('projects').getFullList({ sort: '-created' })
  } catch (error) {
    console.error('Error in getAccountingProjects:', error)
    throw error
  }
}

export const getAccount = async (accountId: string) => {
  try {
    if (!accountId) throw new Error('Account ID is required')
    return await safeCollection('accounts').getOne<Account>(accountId)
  } catch (error) {
    console.error('Error in getAccount:', error)
    throw error
  }
}

export const getAccounts = async (projectId: string) => {
  try {
    if (!projectId) throw new Error('Project ID is required')
    return await safeCollection('accounts').getFullList<Account>({
      filter: `project_id = "${projectId}"`,
      sort: 'code',
    })
  } catch (error) {
    console.error('Error in getAccounts:', error)
    throw error
  }
}

export const getAccountBalances = async (projectId: string, level?: number, search?: string) => {
  try {
    if (!projectId) throw new Error('Project ID is required')
    let filter = `project_id = "${projectId}"`
    if (level) filter += ` && level <= ${level}`
    if (search) {
      const s = search.replace(/"/g, '\\"')
      filter += ` && (code ~ "${s}" || name ~ "${s}")`
    }

    return await safeCollection('account_balances').getFullList<AccountBalance>({
      filter,
      sort: 'code',
      $cancelKey: `balancete_${projectId}_${level}_${search}`,
    })
  } catch (error) {
    console.error('Error in getAccountBalances:', error)
    throw error
  }
}

export const resetProjectData = async (projectId: string) => {
  try {
    if (!projectId) throw new Error('Project ID is required')
    return await getClient().send(`/backend/v1/projects/${projectId}/reset`, { method: 'POST' })
  } catch (error) {
    console.error('Error in resetProjectData:', error)
    throw error
  }
}

export const getEntryItems = async (projectId: string) => {
  try {
    if (!projectId) throw new Error('Project ID is required')
    return await safeCollection('entry_items').getFullList<EntryItem>({
      filter: `entry_id.project_id = "${projectId}"`,
      expand: 'entry_id',
    })
  } catch (error) {
    console.error('Error in getEntryItems:', error)
    throw error
  }
}

export const getAccountEntries = async (accountId: string, projectId: string) => {
  try {
    if (!accountId || !projectId) throw new Error('Account ID and Project ID are required')
    return await safeCollection('entry_items').getFullList<EntryItem>({
      filter: `account_id = "${accountId}" && entry_id.project_id = "${projectId}"`,
      expand: 'entry_id',
      sort: 'entry_id.date,created',
      fields:
        'id,entry_id,account_id,type,value,created,updated,expand.entry_id.id,expand.entry_id.date,expand.entry_id.description,expand.entry_id.reference',
    })
  } catch (error) {
    console.error('Error in getAccountEntries:', error)
    throw error
  }
}

export const importEcdData = async (
  projectId: string,
  data: { accounts: any[]; entries: any[] },
) => {
  try {
    if (!projectId) throw new Error('Project ID is required')
    return await getClient().send(`/backend/v1/projects/${projectId}/import/ecd`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in importEcdData:', error)
    throw error
  }
}

export const getEntryItemsByEntryIds = async (entryIds: string[]) => {
  try {
    if (!entryIds || entryIds.length === 0) return []
    const chunkSize = 50
    const results: EntryItem[] = []
    const client = getClient()
    for (let i = 0; i < entryIds.length; i += chunkSize) {
      const chunk = entryIds.slice(i, i + chunkSize)
      const filter = chunk.map((id) => `entry_id="${id}"`).join('||')
      const items = await client.collection('entry_items').getFullList<EntryItem>({
        filter: `(${filter})`,
        expand: 'account_id',
        fields:
          'id,entry_id,account_id,type,value,expand.account_id.id,expand.account_id.code,expand.account_id.name',
      })
      results.push(...items)
    }
    return results
  } catch (error) {
    console.error('Error in getEntryItemsByEntryIds:', error)
    throw error
  }
}

export const getRootAccountBalances = async (projectId: string) => {
  try {
    if (!projectId) throw new Error('Project ID is required')
    return await safeCollection('account_balances').getFullList<AccountBalance>({
      filter: `project_id = "${projectId}" && level = 1`,
      sort: 'code',
    })
  } catch (error) {
    console.error('Error in getRootAccountBalances:', error)
    throw error
  }
}

export const getChildAccountBalances = async (projectId: string, parentId: string) => {
  try {
    if (!projectId || !parentId) throw new Error('Project ID and Parent ID are required')
    return await safeCollection('account_balances').getFullList<AccountBalance>({
      filter: `project_id = "${projectId}" && parent_id = "${parentId}"`,
      sort: 'code',
    })
  } catch (error) {
    console.error('Error in getChildAccountBalances:', error)
    throw error
  }
}

export const getAccountBalancesByIds = async (projectId: string, search: string) => {
  try {
    if (!projectId) throw new Error('Project ID is required')
    let filter = `project_id = "${projectId}"`
    if (search) {
      const s = search.replace(/"/g, '\\"')
      filter += ` && (code ~ "${s}" || name ~ "${s}")`
    }
    return await safeCollection('account_balances').getList<AccountBalance>(1, 200, {
      filter,
      sort: 'code',
    })
  } catch (error) {
    console.error('Error in getAccountBalancesByIds:', error)
    throw error
  }
}

export const getAccountEntriesPaginated = async (
  accountId: string,
  projectId: string,
  page: number = 1,
  perPage: number = 50,
  options?: {
    search?: string
    startDate?: string
    endDate?: string
  },
) => {
  try {
    if (!accountId || !projectId) throw new Error('Account ID and Project ID are required')

    let filter = `account_id = "${accountId}" && entry_id.project_id = "${projectId}"`

    if (options?.search) {
      const s = options.search.replace(/"/g, '\\"')
      filter += ` && (entry_id.description ~ "${s}" || entry_id.reference ~ "${s}")`
    }

    if (options?.startDate) {
      filter += ` && entry_id.date >= "${options.startDate}"`
    }

    if (options?.endDate) {
      filter += ` && entry_id.date <= "${options.endDate}"`
    }

    return await safeCollection('entry_items').getList<EntryItem>(page, perPage, {
      filter,
      expand: 'entry_id',
      sort: 'entry_id.date,created',
      fields:
        'id,entry_id,account_id,type,value,created,updated,expand.entry_id.id,expand.entry_id.date,expand.entry_id.description,expand.entry_id.reference',
    })
  } catch (error) {
    console.error('Error in getAccountEntriesPaginated:', error)
    throw error
  }
}

export const getAccountRunningBalance = async (
  accountId: string,
  projectId: string,
  beforeDate?: string,
) => {
  try {
    if (!accountId || !projectId) throw new Error('Account ID and Project ID are required')

    let filter = `account_id = "${accountId}" && entry_id.project_id = "${projectId}"`

    if (beforeDate) {
      filter += ` && entry_id.date < "${beforeDate}"`
    }

    return await safeCollection('entry_items').getFullList<{
      id: string
      type: 'debit' | 'credit'
      value: number
      entry_id: string
    }>({
      filter,
      sort: 'entry_id.date,created',
      fields: 'id,type,value,entry_id',
    })
  } catch (error) {
    console.error('Error in getAccountRunningBalance:', error)
    throw error
  }
}

export const getAccountEntriesTotalCount = async (accountId: string, projectId: string) => {
  try {
    if (!accountId || !projectId) throw new Error('Account ID and Project ID are required')

    const filter = `account_id = "${accountId}" && entry_id.project_id = "${projectId}"`

    const result = await safeCollection('entry_items').getList(1, 1, {
      filter,
      fields: 'id',
    })

    return result.totalItems
  } catch (error) {
    console.error('Error in getAccountEntriesTotalCount:', error)
    return 0
  }
}
