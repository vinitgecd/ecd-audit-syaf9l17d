import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAssetsByCategory,
  detectMissingAssets,
  type CategoryResult,
  type RiskAssessment,
  type MissingAssetInfo,
} from '@/services/presuncoes-ativo-oculto'

export interface UseHiddenAssetsResult {
  isLoading: boolean
  error: string | null
  assets: CategoryResult[]
  riskLevel: RiskAssessment['riskLevel']
  recommendations: MissingAssetInfo[]
  refetch: () => void
}

export function useHiddenAssets(projectId: string): UseHiddenAssetsResult {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assets, setAssets] = useState<CategoryResult[]>([])

  const loadData = useCallback(async () => {
    if (!projectId) {
      setAssets([])
      setIsLoading(false)
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAssetsByCategory(projectId)
      setAssets(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados de ativos.')
      setAssets([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refetch = useCallback(() => {
    loadData()
  }, [loadData])

  const { riskLevel, recommendations } = useMemo(() => {
    const assessment = detectMissingAssets(assets)
    return {
      riskLevel: assessment.riskLevel,
      recommendations: assessment.missingCategories,
    }
  }, [assets])

  return {
    isLoading,
    error,
    assets,
    riskLevel,
    recommendations,
    refetch,
  }
}
