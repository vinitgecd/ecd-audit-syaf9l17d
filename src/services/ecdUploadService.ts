import pb from '@/lib/pocketbase/client'

export interface UploadChunkResponse {
  success: boolean
  recordsProcessed?: number
  codeToId?: Record<string, string>
  entries?: number
  items?: number
  errors?: Array<{ lineNumber: number; error: string }>
}

export async function uploadChunk(
  projectId: string,
  action: 'clear' | 'accounts' | 'entries',
  data?: unknown,
): Promise<UploadChunkResponse> {
  const payload: Record<string, unknown> = { projectId, action }
  if (data !== undefined) {
    payload.data = data
  }
  return pb.send('/backend/v1/ecd/upload-chunk', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
