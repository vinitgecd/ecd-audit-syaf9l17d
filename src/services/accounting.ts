import pb from '@/lib/pocketbase/client'

export interface Account {
  id: string
  project_id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
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

export const getAccountingProjects = () =>
  pb.collection('projects').getFullList({ sort: '-created' })

export const getAccount = (accountId: string) =>
  pb.collection('accounts').getOne<Account>(accountId)

export const getAccounts = (projectId: string) =>
  pb.collection('accounts').getFullList<Account>({
    filter: `project_id = "${projectId}"`,
    sort: 'code',
  })

export const getEntryItems = (projectId: string) =>
  pb.collection('entry_items').getFullList<EntryItem>({
    filter: `entry_id.project_id = "${projectId}"`,
    expand: 'entry_id',
  })

export const getAccountEntries = (accountId: string) =>
  pb.collection('entry_items').getFullList<EntryItem>({
    filter: `account_id = "${accountId}"`,
    expand: 'entry_id',
    sort: 'entry_id.date,created',
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
