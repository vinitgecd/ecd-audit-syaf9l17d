import pb from '@/lib/pocketbase/client'
import type { AccountBalance } from '@/services/accounting'

export type AssetCategory = 'imoveis' | 'aplicacoes' | 'estoques' | 'veiculos'

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
  keywords: string[]
  recommendation: string
}

const CATEGORY_CONFIG: Record<AssetCategory, CategoryConfig> = {
  imoveis: {
    label: 'Imóveis',
    keywords: [
      'imóvel',
      'imovel',
      'terreno',
      'edifício',
      'edificio',
      'propriedade',
      'construção',
      'construcao',
      'benfeitoria',
    ],
    recommendation: 'Nenhum imóvel registrado. Verifique se há propriedades não contabilizadas.',
  },
  aplicacoes: {
    label: 'Aplicações Financeiras',
    keywords: [
      'aplicação',
      'aplicacao',
      'investimento',
      'fundo',
      'renda fixa',
      'cdb',
      'rdb',
      'tesouro',
      'poupança',
      'poupanca',
    ],
    recommendation:
      'Nenhuma aplicação financeira registrada. Verifique se há investimentos não contabilizados.',
  },
  estoques: {
    label: 'Estoques',
    keywords: [
      'estoque',
      'mercadoria',
      'produto',
      'material',
      'inventário',
      'inventario',
      'almoxarifado',
      'matéria-prima',
      'materia-prima',
    ],
    recommendation: 'Nenhum estoque registrado. Verifique se há inventários não contabilizados.',
  },
  veiculos: {
    label: 'Veículos',
    keywords: [
      'veículo',
      'veiculo',
      'automóvel',
      'automovel',
      'caminhão',
      'caminhao',
      'moto',
      'frota',
      'carro',
    ],
    recommendation: 'Nenhum veículo registrado. Verifique se há veículos não contabilizados.',
  },
}

const parseBalance = (val: unknown): number => {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj.value === 'number') return obj.value
    if (typeof obj.value === 'string') {
      const n = parseFloat(obj.value)
      return isNaN(n) ? 0 : n
    }
  }
  return 0
}

const categorizeAccount = (name: string): AssetCategory | null => {
  const lowerName = name.toLowerCase()
  for (const [cat, config] of Object.entries(CATEGORY_CONFIG)) {
    if (config.keywords.some((kw) => lowerName.includes(kw))) {
      return cat as AssetCategory
    }
  }
  return null
}

export const getAssetsByCategory = async (projectId: string): Promise<CategoryResult[]> => {
  if (!projectId) return []

  const balances = await pb.collection('account_balances').getFullList<AccountBalance>({
    filter: `project_id = "${projectId}" && type = "asset"`,
    sort: 'code',
  })

  const categorized: Record<AssetCategory, CategoryAccount[]> = {
    imoveis: [],
    aplicacoes: [],
    estoques: [],
    veiculos: [],
  }

  for (const bal of balances) {
    const category = categorizeAccount(bal.name)
    if (!category) continue

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

  return (Object.keys(CATEGORY_CONFIG) as AssetCategory[]).map((cat) => {
    const accounts = categorized[cat]
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
    return {
      category: cat,
      label: CATEGORY_CONFIG[cat].label,
      totalBalance,
      accountCount: accounts.length,
      accounts: accounts.sort((a, b) => a.code.localeCompare(b.code)),
      found: accounts.length > 0 && totalBalance !== 0,
    }
  })
}

export const detectMissingAssets = (categories: CategoryResult[]): RiskAssessment => {
  const missing: MissingAssetInfo[] = []

  for (const cat of categories) {
    if (!cat.found) {
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
