import { useState, useCallback, useRef } from 'react'
import { uploadChunk, type UploadChunkResponse } from '@/services/ecdUploadService'

export type UploadStatus = 'idle' | 'parsing' | 'uploading' | 'done' | 'error'

export interface UploadState {
  status: UploadStatus
  progress: number
  message: string
  error: string | null
}

export interface EcdAccount {
  code: string
  name: string
  type: string
  level: number
  nature: string
  is_group: boolean
  parent_code?: string
}

export interface EcdEntryItem {
  account_code?: string
  account_id?: string
  type: 'debit' | 'credit'
  value: number
}

export interface EcdEntry {
  date: string
  description: string
  reference: string
  items: EcdEntryItem[]
}

export interface EcdParseResult {
  accounts: EcdAccount[]
  entries: EcdEntry[]
}

const ENTRY_CHUNK_SIZE = 5000

export function useEcdUpload() {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
    error: null,
  })
  const workerRef = useRef<Worker | null>(null)

  const parseEcdFile = useCallback((file: File): Promise<EcdParseResult> => {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('../workers/ecdParser.worker.ts', import.meta.url), {
          type: 'module',
        })
        workerRef.current = worker

        worker.onmessage = (e: MessageEvent) => {
          if (e.data?.error) {
            reject(new Error(e.data.error))
          } else {
            resolve({
              accounts: e.data?.accounts || [],
              entries: e.data?.entries || [],
            })
          }
          worker.terminate()
          workerRef.current = null
        }

        worker.onerror = (err: ErrorEvent) => {
          reject(new Error(err.message || 'Erro ao processar arquivo ECD'))
          worker.terminate()
          workerRef.current = null
        }

        worker.postMessage({ file })
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Falha ao iniciar processamento'))
      }
    })
  }, [])

  const upload = useCallback(
    async (projectId: string, file: File): Promise<void> => {
      try {
        setState({
          status: 'parsing',
          progress: 0,
          message: 'Processando arquivo ECD...',
          error: null,
        })

        const result = await parseEcdFile(file)

        setState({
          status: 'uploading',
          progress: 10,
          message: 'Limpando dados existentes...',
          error: null,
        })
        await uploadChunk(projectId, 'clear')

        setState({
          status: 'uploading',
          progress: 25,
          message: `Enviando ${result.accounts.length} contas...`,
          error: null,
        })
        const accountsResult: UploadChunkResponse = await uploadChunk(
          projectId,
          'accounts',
          result.accounts,
        )

        const codeToId = accountsResult.codeToId || {}

        const mappedEntries: EcdEntry[] = result.entries.map((entry) => ({
          ...entry,
          items: entry.items.map((item) => ({
            ...item,
            account_id:
              item.account_id ||
              (item.account_code ? codeToId[item.account_code] : undefined) ||
              '',
          })),
        }))

        const totalChunks = Math.ceil(mappedEntries.length / ENTRY_CHUNK_SIZE)
        for (let i = 0; i < mappedEntries.length; i += ENTRY_CHUNK_SIZE) {
          const chunkIndex = Math.floor(i / ENTRY_CHUNK_SIZE)
          const chunk = mappedEntries.slice(i, i + ENTRY_CHUNK_SIZE)
          const chunkProgress = 40 + Math.round((chunkIndex / Math.max(totalChunks, 1)) * 55)

          setState({
            status: 'uploading',
            progress: chunkProgress,
            message: `Enviando lançamentos (${i + 1}-${Math.min(i + ENTRY_CHUNK_SIZE, mappedEntries.length)} de ${mappedEntries.length})...`,
            error: null,
          })

          await uploadChunk(projectId, 'entries', chunk)
        }

        setState({
          status: 'done',
          progress: 100,
          message: 'Importação concluída com sucesso!',
          error: null,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        setState({
          status: 'error',
          progress: 0,
          message: '',
          error: message,
        })
      }
    },
    [parseEcdFile],
  )

  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setState({
      status: 'idle',
      progress: 0,
      message: '',
      error: null,
    })
  }, [])

  return { ...state, upload, reset }
}
