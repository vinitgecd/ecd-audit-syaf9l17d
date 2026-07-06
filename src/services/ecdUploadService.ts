import pb from '@/lib/pocketbase/client'

export interface UploadChunkResponse {
  success: boolean
  recordsProcessed?: number
  codeToId?: Record<string, string>
  entries?: number
  items?: number
  errors?: Array<{ lineNumber: number; error: string }>
}

const MAX_RETRIES = 3
const BACKOFF_DELAYS = [1000, 2000, 4000]
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024

export async function uploadEcdChunk(
  projectId: string,
  fileId: string,
  action: 'clear' | 'accounts' | 'entries',
  data: any[],
  chunkIndex: number,
  totalChunks: number,
  onRetry?: (attempt: number) => void,
): Promise<UploadChunkResponse> {
  const payload = action !== 'clear' ? JSON.stringify(data) : ''

  if (payload && payload.length > MAX_PAYLOAD_SIZE) {
    throw new Error('Chunk excede o limite de 5MB')
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await pb.send('/backend/v1/ecd/upload-chunk', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          fileId,
          action,
          chunkIndex,
          totalChunks,
          data: action !== 'clear' ? data : undefined,
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Chunk-Index': String(chunkIndex),
          'X-Total-Chunks': String(totalChunks),
          'X-File-Id': fileId,
        },
      })
      return response as UploadChunkResponse
    } catch (error: any) {
      const status = error?.status || 0
      if (status >= 400 && status < 500) throw error
      if (attempt < MAX_RETRIES) {
        onRetry?.(attempt + 1)
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_DELAYS[attempt]))
      } else {
        throw new Error('Falha ao enviar dados. Tente novamente.')
      }
    }
  }
  throw new Error('Falha ao enviar dados. Tente novamente.')
}
