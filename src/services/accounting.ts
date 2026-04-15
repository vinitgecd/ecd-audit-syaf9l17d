import pb from '@/lib/pocketbase/client'

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

export const createAccount = (data: Partial<Account>) =>
  pb.collection('accounts').create<Account>(data)

export const createJournalEntry = (data: Partial<JournalEntry>) =>
  pb.collection('journal_entries').create<JournalEntry>(data)

export const createEntryItem = (data: Partial<EntryItem>) =>
  pb.collection('entry_items').create<EntryItem>(data)

export const getAccountingProjects = () =>
  pb.collection('projects').getFullList({ sort: '-created' })

export const getAccount = (accountId: string) =>
  pb.collection('accounts').getOne<Account>(accountId)

export const getAccounts = (projectId: string) =>
  pb.collection('accounts').getFullList<Account>({
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

  const result = await pb.collection('account_balances').getFullList<AccountBalance>({
    filter,
    sort: 'code',
    $cancelKey: `balancete_${projectId}_${level}_${search}`,
  })

  return result
}

export const resetProjectData = (projectId: string) =>
  pb.send(`/backend/v1/projects/${projectId}/reset`, { method: 'POST' })

export const getEntryItems = (projectId: string) =>
  pb.collection('entry_items').getFullList<EntryItem>({
    filter: `entry_id.project_id = "${projectId}"`,
    expand: 'entry_id',
  })

export const getAccountEntries = (accountId: string, projectId: string) =>
  pb.collection('entry_items').getFullList<EntryItem>({
    filter: `account_id = "${accountId}" && entry_id.project_id = "${projectId}"`,
    expand: 'entry_id',
    sort: 'entry_id.date,created',
  })

export const importEcdData = (projectId: string, data: { accounts: any[]; entries: any[] }) =>
  pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })

export const getEntryItemsByEntryIds = async (entryIds: string[]) => {
  if (entryIds.length === 0) return []
  const chunkSize = 50
  const results: EntryItem[] = []
  for (let i = 0; i < entryIds.length; i += chunkSize) {
    const chunk = entryIds.slice(i, i + chunkSize)
    const filter = chunk.map((id) => `entry_id="${id}"`).join('||')
    const items = await pb.collection('entry_items').getFullList<EntryItem>({
      filter: `(${filter})`,
      expand: 'account_id',
    })
    results.push(...items)
  }
  return results
}
