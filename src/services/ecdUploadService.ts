import pb from '@/lib/pocketbase/client'
import { compressData } from '@/lib/compression'

export interface EcdUploadResult {
  success: boolean
  inserted?: number
  error?: string
}

export interface EcdChunkData {
  type: 'account' | 'entry'
  fields: Record<string, unknown>
  projectId: string
}

export async function clearProjectData(projectId: string): Promise<EcdUploadResult> {
  try {
    const result = await pb.send('/backend/v1/ecd/upload-chunk', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        action: 'clear',
        fileId: 'clear',
      }),
    })
    return { success: true, inserted: 0 }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function uploadEcdChunk(
  projectId: string,
  fileId: string,
  records: EcdChunkData[],
): Promise<EcdUploadResult> {
  try {
    const compressed = compressData(JSON.stringify(records))
    const result = await pb.send('/backend/v1/ecd/upload-chunk', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        action: 'upload',
        fileId,
        compressedData: compressed,
      }),
    })
    return { success: true, inserted: (result as { inserted?: number }).inserted ?? 0 }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}
