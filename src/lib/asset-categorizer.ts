import {
  Building2,
  Box,
  Truck,
  TrendingUp,
  CreditCard,
  Package,
  type LucideIcon,
} from 'lucide-react'

export type AssetCategoryName =
  | 'Imóveis'
  | 'Estoques'
  | 'Veículos'
  | 'Aplicações Financeiras'
  | 'Bancos'
  | 'Outros'

export const ASSET_CATEGORY_ORDER: AssetCategoryName[] = [
  'Imóveis',
  'Estoques',
  'Veículos',
  'Aplicações Financeiras',
  'Bancos',
  'Outros',
]

const CATEGORY_KEYWORDS: Record<Exclude<AssetCategoryName, 'Outros'>, string[]> = {
  Imóveis: [
    'IMOVEL',
    'PROPRIEDADE',
    'TERRENO',
    'PRÉDIO',
    'IMÓVEL',
    'EDIFICIO',
    'CONSTRUÇÃO',
    'BENFEITORIAS',
  ],
  Estoques: ['ESTOQUE', 'INVENTÁRIO', 'MERCADORIA', 'MATÉRIA-PRIMA', 'PRODUTOS', 'INSUMO'],
  Veículos: [
    'VEICULO',
    'AUTOMÓVEL',
    'CARRO',
    'CAMINHÃO',
    'MOTO',
    'MOTOCICLETA',
    'TRANSPORTE',
    'FROTA',
  ],
  'Aplicações Financeiras': [
    'APLICAÇÃO',
    'INVESTIMENTO',
    'FUNDO',
    'AÇÕES',
    'TÍTULOS',
    'DEBENTURE',
    'CDB',
    'POUPANÇA',
  ],
  Bancos: ['BANCO', 'CONTA CORRENTE', 'CONTA POUPANÇA', 'CAIXA', 'DISPONIBILIDADE', 'NUMERÁRIO'],
}

const CHECK_ORDER: Exclude<AssetCategoryName, 'Outros'>[] = [
  'Imóveis',
  'Estoques',
  'Veículos',
  'Aplicações Financeiras',
  'Bancos',
]

export function categorizeAsset(accountName: string): AssetCategoryName {
  const upper = accountName.toUpperCase()
  for (const category of CHECK_ORDER) {
    if (CATEGORY_KEYWORDS[category].some((kw) => upper.includes(kw))) {
      return category
    }
  }
  return 'Outros'
}

const CATEGORY_ICONS: Record<AssetCategoryName, LucideIcon> = {
  Imóveis: Building2,
  Estoques: Box,
  Veículos: Truck,
  'Aplicações Financeiras': TrendingUp,
  Bancos: CreditCard,
  Outros: Package,
}

const CATEGORY_COLORS: Record<AssetCategoryName, string> = {
  Imóveis: 'bg-blue-100',
  Estoques: 'bg-amber-100',
  Veículos: 'bg-red-100',
  'Aplicações Financeiras': 'bg-green-100',
  Bancos: 'bg-purple-100',
  Outros: 'bg-gray-100',
}

export function getCategoryIcon(category: AssetCategoryName): LucideIcon {
  return CATEGORY_ICONS[category]
}

export function getCategoryColor(category: AssetCategoryName): string {
  return CATEGORY_COLORS[category]
}
