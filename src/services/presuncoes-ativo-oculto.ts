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
      'terrenos',
      'edificação',
      'edificacao',
      'edifício',
      'edificio',
      'prédio',
      'predio',
      'propriedade',
      'construção',
      'construcao',
      'benfeitoria',
      'benfeitorias',
      'obra em andamento',
      'obras em andamento',
      'obra andamento',
      'instalação',
      'instalacao',
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
      'título',
      'titulo',
      'debênture',
      'debenture',
      'aplicação financeira',
      'aplicacao financeira',
    ],
    recommendation:
      'Nenhuma aplicação financeira registrada. Verifique se há investimentos não contabilizados.',
  },
  estoques: {
    label: 'Estoques',
    keywords: [
      'estoque',
      'mercadoria',
      'mercadorias',
      'produto',
      'produtos',
      'inventário',
      'inventario',
      'almoxarifado',
      'matéria-prima',
      'materia-prima',
      'matéria prima',
      'materia prima',
      'insumo',
      'insumos',
      'produtos acabados',
      'produtos em elaboração',
      'produtos em elaboracao',
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
      'trator',
      'tratores',
      'reboque',
      'semitrator',
      'máquina',
      'maquina',
      'implemento',
    ],
    recommendation: 'Nenhum veículo registrado. Verifique se há veículos não contabilizados.',
  },
}

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

const categorizeAccount = (name: string, code: string): AssetCategory | null => {
  const lowerName = name.toLowerCase()
  const lowerCode = code.toLowerCase()
  for (const [cat, config] of Object.entries(CATEGORY_CONFIG)) {
    if (config.keywords.some((kw) => lowerName.includes(kw) || lowerCode.includes(kw))) {
      return cat as AssetCategory
    }
  }
  return null
}

interface CategorizedAccount extends CategoryAccount {
  parentId: string | null
}

export const getAssetsByCategory = async (projectId: string): Promise<CategoryResult[]> => {
  if (!projectId) return []

  const balances = await pb.collection('account_balances').getFullList<AccountBalance>({
    filter: `project_id = "${projectId}" && type = "asset"`,
    sort: 'code',
  })

  const categorized: Record<AssetCategory, CategorizedAccount[]> = {
    imoveis: [],
    aplicacoes: [],
    estoques: [],
    veiculos: [],
  }

  for (const bal of balances) {
    const category = categorizeAccount(bal.name, bal.code)
    if (!category) continue

    const debits = parseBalance(bal.total_debits)
    const credits = parseBalance(bal.total_credits)
    const balance = debits - credits

    categorized[category].push({
      id: bal.id,
      code: bal.code,
      name: bal.name,
      balance,
      parentId: bal.parent_id ?? null,
    })
  }

  return (Object.keys(CATEGORY_CONFIG) as AssetCategory[]).map((cat) => {
    const allAccounts = categorized[cat]

    const categoryIds = new Set(allAccounts.map((a) => a.id))
    const topLevel = allAccounts.filter((acc) => !acc.parentId || !categoryIds.has(acc.parentId))

    const accounts = topLevel
      .map(({ id, code, name, balance }) => ({ id, code, name, balance }))
      .sort((a, b) => a.code.localeCompare(b.code))

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

    return {
      category: cat,
      label: CATEGORY_CONFIG[cat].label,
      totalBalance,
      accountCount: accounts.length,
      accounts,
      found: allAccounts.length > 0,
      hasBalance: totalBalance !== 0,
    }
  })
}

export const detectMissingAssets = (categories: CategoryResult[]): RiskAssessment => {
  const missing: MissingAssetInfo[] = []

  for (const cat of categories) {
    if (!cat.found || !cat.hasBalance) {
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
