import pb from '@/lib/pocketbase/client'
import type { Account, EntryItem } from '@/services/accounting'
import { getAssetsByCategory, detectMissingAssets } from '@/services/presuncoes-ativo-oculto'

export interface CashBalanceEntry {
  id: string
  entry_id: string
  account_id: string
  type: 'debit' | 'credit'
  value: number
  runningBalance: number
  accountCode: string
  accountName: string
  entryDate: string
  entryDescription: string
  entryReference: string
  created: string
}

const isCashAccount = (account: Account): boolean => {
  if (account.type !== 'asset') return false
  const name = account.name.toLowerCase()
  const codeDigits = account.code.replace(/\D/g, '')
  return (
    name.includes('caixa') ||
    name.includes('banco') ||
    name.includes('tesouraria') ||
    name.includes('aplicacao') ||
    name.includes('aplicação') ||
    name.includes('numerario') ||
    name.includes('numerário') ||
    codeDigits.startsWith('111') ||
    codeDigits.startsWith('112') ||
    codeDigits.startsWith('113')
  )
}

export const getCashAccounts = async (projectId: string): Promise<Account[]> => {
  const accounts = await pb.collection('accounts').getFullList<Account>({
    filter: `project_id = "${projectId}"`,
    sort: 'code',
  })
  return accounts.filter(isCashAccount)
}

export const hasProjectData = async (projectId: string): Promise<boolean> => {
  const result = await pb.collection('accounts').getList(1, 1, {
    filter: `project_id = "${projectId}"`,
  })
  return result.totalItems > 0
}

export const getNegativeCashBalanceEntries = async (
  projectId: string,
): Promise<CashBalanceEntry[]> => {
  const cashAccounts = await getCashAccounts(projectId)
  if (cashAccounts.length === 0) return []

  const results: CashBalanceEntry[] = []

  const CHUNK_SIZE = 40
  for (let i = 0; i < cashAccounts.length; i += CHUNK_SIZE) {
    const chunk = cashAccounts.slice(i, i + CHUNK_SIZE)
    const filterParts = chunk.map((a) => `account_id="${a.id}"`)
    const accountMap = new Map(chunk.map((a) => [a.id, a]))

    const items = await pb.collection('entry_items').getFullList<EntryItem>({
      filter: `entry_id.project_id = "${projectId}" && (${filterParts.join('||')})`,
      expand: 'entry_id',
      sort: 'entry_id.date,created',
      fields:
        'id,entry_id,account_id,type,value,created,updated,expand.entry_id.id,expand.entry_id.date,expand.entry_id.description,expand.entry_id.reference',
    })

    const itemsByAccount = new Map<string, EntryItem[]>()
    for (const item of items) {
      const arr = itemsByAccount.get(item.account_id) || []
      arr.push(item)
      itemsByAccount.set(item.account_id, arr)
    }

    for (const [accountId, accountItems] of itemsByAccount.entries()) {
      const account = accountMap.get(accountId)
      if (!account) continue

      let runningBalance = 0
      for (const item of accountItems) {
        runningBalance += item.type === 'debit' ? item.value : -item.value
        if (runningBalance < 0) {
          results.push({
            id: item.id,
            entry_id: item.entry_id,
            account_id: item.account_id,
            type: item.type,
            value: item.value,
            runningBalance,
            accountCode: account.code,
            accountName: account.name,
            entryDate: item.expand?.entry_id?.date || '',
            entryDescription: item.expand?.entry_id?.description || '',
            entryReference: item.expand?.entry_id?.reference || '',
            created: item.created,
          })
        }
      }
    }
  }

  results.sort(
    (a, b) => a.entryDate.localeCompare(b.entryDate) || a.created.localeCompare(b.created),
  )
  return results
}

export interface HiddenAssetsSummary {
  riskLevel: 'low' | 'medium' | 'high'
  missingCount: number
  totalAssetValue: number
}

export const getHiddenAssetsSummary = async (projectId: string): Promise<HiddenAssetsSummary> => {
  const categories = await getAssetsByCategory(projectId)
  const assessment = detectMissingAssets(categories)
  const totalAssetValue = categories.reduce((sum, c) => sum + c.totalBalance, 0)
  return {
    riskLevel: assessment.riskLevel,
    missingCount: assessment.missingCount,
    totalAssetValue,
  }
}
