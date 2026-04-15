import defaultPb from '@/lib/pocketbase/client'
import type PocketBase from 'pocketbase'

const getPb = (): PocketBase => {
  const client = (defaultPb as any)?.default || defaultPb
  if (!client || typeof client.collection !== 'function') {
    throw new Error('Database client not initialized')
  }
  return client as PocketBase
}

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

export const createAccount = async (data: Partial<Account>) =>
  getPb().collection('accounts').create<Account>(data)

export const createJournalEntry = async (data: Partial<JournalEntry>) =>
  getPb().collection('journal_entries').create<JournalEntry>(data)

export const createEntryItem = async (data: Partial<EntryItem>) =>
  getPb().collection('entry_items').create<EntryItem>(data)

export const getAccountingProjects = async () =>
  getPb().collection('projects').getFullList({ sort: '-created' })

export const getAccount = async (accountId: string) =>
  getPb().collection('accounts').getOne<Account>(accountId)

export const getAccounts = async (projectId: string) =>
  getPb()
    .collection('accounts')
    .getFullList<Account>({
      filter: `project_id = "${projectId}"`,
      sort: 'code',
    })

export const getAccountBalances = async (projectId: string, level?: number, search?: string) => {
  let filter = `project_id = "${projectId}"`
  if (level) filter += ` && level <= ${level}`
  if (search) {
    const s = search.replace(/"/g, '\\"')
    filter += ` && (code ~ "${s}" || name ~ "${s}")`
  }

  const result = await getPb()
    .collection('account_balances')
    .getFullList<AccountBalance>({
      filter,
      sort: 'code',
      $cancelKey: `balancete_${projectId}_${level}_${search}`,
    })

  return result
}

export const resetProjectData = async (projectId: string) =>
  getPb().send(`/backend/v1/projects/${projectId}/reset`, { method: 'POST' })

export const getEntryItems = async (projectId: string) =>
  getPb()
    .collection('entry_items')
    .getFullList<EntryItem>({
      filter: `entry_id.project_id = "${projectId}"`,
      expand: 'entry_id',
    })

export const getAccountEntries = async (accountId: string, projectId: string) =>
  getPb()
    .collection('entry_items')
    .getFullList<EntryItem>({
      filter: `account_id = "${accountId}" && entry_id.project_id = "${projectId}"`,
      expand: 'entry_id',
      sort: 'entry_id.date,created',
      fields:
        'id,entry_id,account_id,type,value,created,updated,expand.entry_id.id,expand.entry_id.date,expand.entry_id.description,expand.entry_id.reference',
    })

export const importEcdData = async (projectId: string, data: { accounts: any[]; entries: any[] }) =>
  getPb().send(`/backend/v1/projects/${projectId}/import/ecd`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })

export const getEntryItemsByEntryIds = async (entryIds: string[]) => {
  if (entryIds.length === 0) return []
  const chunkSize = 50
  const results: EntryItem[] = []
  const client = getPb()
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
}
