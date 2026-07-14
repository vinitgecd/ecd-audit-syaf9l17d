import pb from '@/lib/pocketbase/client'
import type { AccountBalance } from '@/services/accounting'

export type AssetCategory = 'imoveis' | 'aplicacoes' | 'estoques' | 'veiculos' | 'outros'

export interface CategoryAccount {
  id: string
  code: string
  name: string
  balance: number
}

export interface CategoryResult {
  category: AssetCategory
  label: string
  totalBalance: number
  accountCount: number
  accounts: CategoryAccount[]
  found: boolean
  hasBalance: boolean
}

export interface MissingAssetInfo {
  category: AssetCategory
  label: string
  recommendation: string
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high'
  missingCategories: MissingAssetInfo[]
  missingCount: number
}

interface CategoryConfig {
  label: string
  prefixes: string[]
  recommendation: string
}

const CATEGORY_CONFIG: Record<AssetCategory, CategoryConfig> = {
  imoveis: {
    label: 'Imóveis',
    prefixes: ['1.1.1'],
    recommendation:
      'Nenhum saldo registrado em Imóveis. Verifique se há propriedades não contabilizadas.',
  },
  aplicacoes: {
    label: 'Aplicações Financeiras',
    prefixes: ['1.1.2'],
    recommendation:
      'Nenhum saldo registrado em Aplicações Financeiras. Verifique se há investimentos não contabilizados.',
  },
  estoques: {
    label: 'Estoques',
    prefixes: ['1.1.3'],
    recommendation:
      'Nenhum saldo registrado em Estoques. Verifique se há inventários não contabilizados.',
  },
  veiculos: {
    label: 'Veículos',
    prefixes: ['1.1.4'],
    recommendation:
      'Nenhum saldo registrado em Veículos. Verifique se há veículos não contabilizados.',
  },
  outros: {
    label: 'Outros',
    prefixes: [],
    recommendation:
      'Nenhum saldo registrado em Outros Ativos. Verifique se há outros ativos não contabilizados.',
  },
}

const CATEGORY_ORDER: AssetCategory[] = ['imoveis', 'aplicacoes', 'estoques', 'veiculos', 'outros']

const normalizeCode = (code: string): string => code.trim().toLowerCase()

const parseBalance = (val: unknown): number => {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (typeof val === 'string') {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if ('value' in obj) return parseBalance(obj.value)
    for (const v of Object.values(obj)) {
      if (typeof v === 'number') return isNaN(v) ? 0 : v
      if (typeof v === 'string') {
        const n = parseFloat(v)
        if (!isNaN(n)) return n
      }
    }
  }
  return 0
}

const categorizeByCode = (code: string): AssetCategory => {
  const norm = normalizeCode(code)
  for (const cat of CATEGORY_ORDER) {
    if (cat === 'outros') continue
    const config = CATEGORY_CONFIG[cat]
    if (config.prefixes.some((prefix) => norm.startsWith(normalizeCode(prefix)))) {
      return cat
    }
  }
  return 'outros'
}

export const getAssetsByCategory = async (projectId: string): Promise<CategoryResult[]> => {
  if (!projectId) return []

  const balances = await pb.collection('account_balances').getFullList<AccountBalance>({
    filter: `project_id = "${projectId}" && type = "asset"`,
    sort: 'code',
  })

  const detailAccounts = balances.filter(
    (bal) => !bal.is_group && bal.code && normalizeCode(bal.code).startsWith('1'),
  )

  const categorized: Record<AssetCategory, CategoryAccount[]> = {
    imoveis: [],
    aplicacoes: [],
    estoques: [],
    veiculos: [],
    outros: [],
  }

  for (const bal of detailAccounts) {
    const category = categorizeByCode(bal.code)
    const debits = parseBalance(bal.total_debits)
    const credits = parseBalance(bal.total_credits)
    const balance = debits - credits

    categorized[category].push({
      id: bal.id,
      code: bal.code,
      name: bal.name,
      balance,
    })
  }

  return CATEGORY_ORDER.map((cat) => {
    const accounts = categorized[cat].slice().sort((a, b) => a.code.localeCompare(b.code))

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

    return {
      category: cat,
      label: CATEGORY_CONFIG[cat].label,
      totalBalance,
      accountCount: accounts.length,
      accounts,
      found: accounts.length > 0,
      hasBalance: totalBalance > 0,
    }
  })
}

export const detectMissingAssets = (categories: CategoryResult[]): RiskAssessment => {
  const missing: MissingAssetInfo[] = []

  for (const cat of categories) {
    if (cat.totalBalance === 0) {
      missing.push({
        category: cat.category,
        label: cat.label,
        recommendation: CATEGORY_CONFIG[cat.category].recommendation,
      })
    }
  }

  const missingCount = missing.length
  let riskLevel: 'low' | 'medium' | 'high'
  if (missingCount >= 3) {
    riskLevel = 'high'
  } else if (missingCount >= 1) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'low'
  }

  return { riskLevel, missingCategories: missing, missingCount }
}
