import { useState, useCallback } from 'react'
import { uploadEcdChunk, clearProjectData } from '@/services/ecdUploadService'

interface UseEcdUploadOptions {
  projectId: string
  onProgress?: (percent: number) => void
  onComplete?: (inserted: number) => void
  onError?: (error: string) => void
}

interface UseEcdUploadReturn {
  uploading: boolean
  progress: number
  error: string | null
  uploadFile: (file: File) => Promise<void>
  clearData: () => Promise<void>
}

export function useEcdUpload({
  projectId,
  onProgress,
  onComplete,
  onError,
}: UseEcdUploadOptions): UseEcdUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setProgress(0)
      setError(null)
      try {
        const { parseEcdFile } = await import('@/lib/ecd-parser')
        const { accounts, entries } = await parseEcdFile(file)

        onProgress?.(5)
        setProgress(5)

        await clearProjectData(projectId)

        const fileId = `upload-${Date.now()}`
        const allRecords = [
          ...accounts.map((acc) => ({ type: 'account' as const, fields: acc, projectId })),
          ...entries.map((entry) => ({ type: 'entry' as const, fields: entry, projectId })),
        ]

        const chunkSize = 500
        for (let i = 0; i < allRecords.length; i += chunkSize) {
          const chunk = allRecords.slice(i, i + chunkSize)
          const result = await uploadEcdChunk(projectId, fileId, chunk)
          if (!result.success) {
            throw new Error(result.error || 'Failed to upload chunk')
          }
          const pct = 5 + Math.round(((i + chunk.length) / allRecords.length) * 90)
          setProgress(pct)
          onProgress?.(pct)
        }

        setProgress(100)
        onProgress?.(100)
        onComplete?.(allRecords.length)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        onError?.(msg)
      } finally {
        setUploading(false)
      }
    },
    [projectId, onProgress, onComplete, onError],
  )

  const clearData = useCallback(async () => {
    setUploading(true)
    setError(null)
    try {
      await clearProjectData(projectId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      onError?.(msg)
    } finally {
      setUploading(false)
    }
  }, [projectId, onError])

  return { uploading, progress, error, uploadFile, clearData }
}
