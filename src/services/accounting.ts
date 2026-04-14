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
  }
}

export const getAccountingProjects = () =>
  pb.collection('projects').getFullList({ sort: '-created' })

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
