import pb from '@/lib/pocketbase/client'

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
  console.error('[ECD Upload] Limpando dados do projeto:', projectId)
  try {
    await pb.send('/backend/v1/ecd/upload-chunk', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        action: 'clear',
        fileId: 'clear',
      }),
    })
    console.error('[ECD Upload] Dados do projeto limpos com sucesso:', projectId)
    return { success: true, inserted: 0 }
  } catch (error: unknown) {
    console.error('[ECD Upload] Erro ao limpar dados do projeto:', {
      projectId,
      error,
    })
    const msg = error instanceof Error ? error.message : 'Erro desconhecido ao limpar dados'
    return { success: false, error: msg }
  }
}

export async function uploadEcdChunk(
  projectId: string,
  fileId: string,
  records: EcdChunkData[],
): Promise<EcdUploadResult> {
  console.error('[ECD Upload] Enviando lote:', {
    projectId,
    fileId,
    recordCount: records.length,
  })
  try {
    const result = await pb.send('/backend/v1/ecd/upload-chunk', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        action: 'upload',
        fileId,
        records,
      }),
    })
    const inserted = (result as { inserted?: number }).inserted ?? 0
    console.error('[ECD Upload] Lote enviado com sucesso:', {
      inserted,
      recordCount: records.length,
    })
    return { success: true, inserted }
  } catch (error: unknown) {
    console.error('[ECD Upload] Erro ao enviar lote:', {
      projectId,
      fileId,
      recordCount: records.length,
      error,
    })
    const msg = error instanceof Error ? error.message : 'Erro desconhecido ao enviar lote'
    return { success: false, error: msg }
  }
}
