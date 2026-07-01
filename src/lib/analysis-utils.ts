import type { Account } from '@/services/accounting'

export interface AnalysisRow {
  id: string
  code: string
  name: string
  type: Account['type']
  level: number
  isGroup: boolean
  currentBalance: number
  previousBalance: number
  verticalAnalysis: number
  horizontalAnalysis: number | null
}

export interface AnalysisData {
  bpRows: AnalysisRow[]
  dreRows: AnalysisRow[]
  totalAssets: number
  totalLiabilitiesEquity: number
  totalRevenue: number
}

type BalanceMap = Map<string, { debits: number; credits: number }>
type ComputedBalance = Map<string, { current: number; previous: number }>

export function aggregateEntryItems(
  items: { account_id: string; type: string; value: number }[],
): BalanceMap {
  const map: BalanceMap = new Map()
  for (const item of items) {
    const existing = map.get(item.account_id) || { debits: 0, credits: 0 }
    if (item.type === 'debit') existing.debits += item.value
    else existing.credits += item.value
    map.set(item.account_id, existing)
  }
  return map
}

function computeBalance(type: Account['type'], debits: number, credits: number): number {
  const isCreditNormal = type === 'liability' || type === 'equity' || type === 'revenue'
  return isCreditNormal ? credits - debits : debits - credits
}

function rollupBalances(
  accounts: Account[],
  current: BalanceMap,
  previous: BalanceMap,
): ComputedBalance {
  const childrenMap = new Map<string, Account[]>()
  for (const acc of accounts) {
    if (acc.parent_id) {
      const siblings = childrenMap.get(acc.parent_id) || []
      siblings.push(acc)
      childrenMap.set(acc.parent_id, siblings)
    }
  }

  const result: ComputedBalance = new Map()

  const rollup = (acc: Account): { current: number; previous: number } => {
    const cached = result.get(acc.id)
    if (cached) return cached

    if (!acc.is_group) {
      const curr = current.get(acc.id) || { debits: 0, credits: 0 }
      const prev = previous.get(acc.id) || { debits: 0, credits: 0 }
      const bal = {
        current: computeBalance(acc.type, curr.debits, curr.credits),
        previous: computeBalance(acc.type, prev.debits, prev.credits),
      }
      result.set(acc.id, bal)
      return bal
    }

    const children = childrenMap.get(acc.id) || []
    let curr = 0
    let prev = 0
    for (const child of children) {
      const childBal = rollup(child)
      curr += childBal.current
      prev += childBal.previous
    }
    const bal = { current: curr, previous: prev }
    result.set(acc.id, bal)
    return bal
  }

  for (const acc of accounts) {
    if (!acc.parent_id || acc.level === 1) rollup(acc)
  }
  return result
}

export function computeAnalysis(
  accounts: Account[],
  current: BalanceMap,
  previous: BalanceMap,
): AnalysisData {
  const balances = rollupBalances(accounts, current, previous)

  let totalAssets = 0
  let totalLiabilities = 0
  let totalEquity = 0
  let totalRevenue = 0

  for (const acc of accounts) {
    if (acc.level === 1 || !acc.parent_id) {
      const bal = balances.get(acc.id)
      if (!bal) continue
      if (acc.type === 'asset') totalAssets += bal.current
      else if (acc.type === 'liability') totalLiabilities += bal.current
      else if (acc.type === 'equity') totalEquity += bal.current
      else if (acc.type === 'revenue') totalRevenue += bal.current
    }
  }

  const totalLiabilitiesEquity = totalLiabilities + totalEquity

  const buildRow = (acc: Account): AnalysisRow => {
    const bal = balances.get(acc.id) || { current: 0, previous: 0 }
    const isBp = acc.type === 'asset' || acc.type === 'liability' || acc.type === 'equity'
    const total = isBp
      ? acc.type === 'asset'
        ? totalAssets
        : totalLiabilitiesEquity
      : totalRevenue
    const va = total !== 0 ? (bal.current / total) * 100 : 0
    const ha = bal.previous !== 0 ? (bal.current / bal.previous - 1) * 100 : null
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      level: acc.level || 1,
      isGroup: acc.is_group || false,
      currentBalance: bal.current,
      previousBalance: bal.previous,
      verticalAnalysis: va,
      horizontalAnalysis: ha,
    }
  }

  const sortAndMap = (types: Account['type'][]): AnalysisRow[] =>
    accounts
      .filter((a) => types.includes(a.type))
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(buildRow)

  return {
    bpRows: sortAndMap(['asset', 'liability', 'equity']),
    dreRows: sortAndMap(['revenue', 'expense']),
    totalAssets,
    totalLiabilitiesEquity,
    totalRevenue,
  }
}

export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

export function formatPercent(val: number | null): string {
  if (val === null) return 'N/A'
  return `${val.toFixed(2)}%`
}
