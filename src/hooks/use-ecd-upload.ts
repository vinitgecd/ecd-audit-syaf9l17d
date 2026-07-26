import { useState, useCallback, useRef } from 'react'
import { uploadEcdChunk, clearProjectData } from '@/services/ecdUploadService'

export type UploadPhase = 'idle' | 'reading' | 'processing' | 'uploading' | 'completed' | 'error'
export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error'

export interface FailedLine {
  lineNumber: number
  error: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const BATCH_SIZE = 500

interface UseEcdUploadOptions {
  projectId: string
  onProgress?: (percent: number) => void
  onComplete?: (inserted: number) => void
  onError?: (error: string) => void
}

function resolveProjectId(arg: string | UseEcdUploadOptions | undefined): string {
  if (typeof arg === 'string') return arg
  if (arg && typeof arg === 'object' && 'projectId' in arg) return arg.projectId
  return ''
}

export function useEcdUpload(arg?: string | UseEcdUploadOptions) {
  const projectId = resolveProjectId(arg)

  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [uploadedRecords, setUploadedRecords] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [uploadedBatches, setUploadedBatches] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [speed, setSpeed] = useState('N/A')
  const [estimatedTime, setEstimatedTime] = useState('N/A')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationPassed, setValidationPassed] = useState(false)
  const [failedLines, setFailedLines] = useState<FailedLine[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const mountedRef = useRef(true)
  const uploadInProgressRef = useRef(false)
  const fileRef = useRef<File | null>(null)
  const cancelledRef = useRef(false)

  const clearValidation = useCallback(() => {
    setValidationError(null)
    setValidationPassed(false)
    setIsValidating(false)
  }, [])

  const selectFile = useCallback(
    (selectedFile: File) => {
      clearValidation()
      setIsValidating(true)

      if (!selectedFile.name.toLowerCase().endsWith('.txt')) {
        setValidationError('Formato invalido. Selecione um arquivo .txt da ECD.')
        setIsValidating(false)
        return
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        setValidationError('Arquivo muito grande. Tamanho maximo: 50MB.')
        setIsValidating(false)
        return
      }

      setFile(selectedFile)
      fileRef.current = selectedFile
      setValidationPassed(true)
      setMessage(`Arquivo selecionado: ${selectedFile.name}`)
      setIsValidating(false)
    },
    [clearValidation],
  )

  const resetUpload = useCallback(() => {
    setFile(null)
    fileRef.current = null
    setProgress(0)
    setPhase('idle')
    setStatus('idle')
    setMessage('')
    setUploadedRecords(0)
    setTotalRecords(0)
    setUploadedBatches(0)
    setTotalBatches(0)
    setSpeed('N/A')
    setEstimatedTime('N/A')
    setIsValidating(false)
    setValidationError(null)
    setValidationPassed(false)
    setFailedLines([])
    setIsUploading(false)
    cancelledRef.current = false
  }, [])

  const startUpload = useCallback(async () => {
    const currentFile = fileRef.current
    if (!currentFile) {
      setValidationError('Nenhum arquivo selecionado.')
      return
    }

    if (uploadInProgressRef.current) return
    uploadInProgressRef.current = true
    cancelledRef.current = false

    setIsUploading(true)
    setStatus('uploading')
    setPhase('reading')
    setMessage('Lendo arquivo...')
    setProgress(0)
    setUploadedRecords(0)
    setUploadedBatches(0)
    setFailedLines([])

    const startTime = Date.now()

    try {
      const { parseEcdFile } = await import('@/lib/ecd-parser')
      const { accounts, entries, failedLines: parseFailedLines } = await parseEcdFile(currentFile)

      if (cancelledRef.current || !mountedRef.current) return

      const total = accounts.length + entries.length
      setTotalRecords(total)
      setPhase('uploading')
      setMessage('Enviando dados...')

      await clearProjectData(projectId)

      if (cancelledRef.current || !mountedRef.current) return

      const allRecords = [
        ...accounts.map((acc) => ({ type: 'account' as const, fields: acc, projectId })),
        ...entries.map((entry) => ({ type: 'entry' as const, fields: entry, projectId })),
      ]

      const batches = Math.ceil(allRecords.length / BATCH_SIZE)
      setTotalBatches(batches)

      let uploaded = 0
      const fileId = `upload-${Date.now()}`

      for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
        if (cancelledRef.current || !mountedRef.current) return

        const chunk = allRecords.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const result = await uploadEcdChunk(projectId, fileId, chunk)

        if (!result.success) {
          throw new Error(result.error || 'Falha ao enviar lote de dados.')
        }

        uploaded += chunk.length
        const pct = Math.round((uploaded / total) * 100)

        setUploadedBatches(batchNum)
        setProgress(pct)
        setUploadedRecords(uploaded)

        const elapsed = (Date.now() - startTime) / 1000
        if (elapsed > 0 && uploaded > 0) {
          const recordsPerSec = uploaded / elapsed
          const remaining = total - uploaded
          const etaSec = remaining / recordsPerSec

          if (recordsPerSec >= 1) {
            setSpeed(`${recordsPerSec.toFixed(1)} reg/s`)
          } else {
            setSpeed(`${(recordsPerSec * 60).toFixed(0)} reg/min`)
          }

          if (etaSec < 60) {
            setEstimatedTime(`${Math.ceil(etaSec)}s`)
          } else {
            setEstimatedTime(`${Math.ceil(etaSec / 60)}min`)
          }
        }

        setMessage(`Enviando lote ${batchNum} de ${batches}...`)
      }

      if (cancelledRef.current || !mountedRef.current) return

      if (parseFailedLines && parseFailedLines.length > 0) {
        setFailedLines(parseFailedLines)
      }

      setProgress(100)
      setStatus('completed')
      setPhase('completed')
      setMessage(`Importacao concluida com sucesso. ${uploaded} registros importados.`)
    } catch (err) {
      if (cancelledRef.current || !mountedRef.current) return
      const msg = err instanceof Error ? err.message : 'Erro desconhecido durante a importacao.'
      setStatus('error')
      setPhase('error')
      setMessage(msg)
    } finally {
      uploadInProgressRef.current = false
      if (mountedRef.current) {
        setIsUploading(false)
      }
    }
  }, [projectId])

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true
    uploadInProgressRef.current = false
    setStatus('idle')
    setPhase('idle')
    setProgress(0)
    setIsUploading(false)
    setMessage('Importacao cancelada.')
  }, [])

  const retryUpload = useCallback(() => {
    const currentFile = fileRef.current
    if (!currentFile) return

    resetUpload()
    setFile(currentFile)
    fileRef.current = currentFile
    setValidationPassed(true)
    setMessage(`Arquivo selecionado: ${currentFile.name}`)
    void startUpload()
  }, [resetUpload, startUpload])

  const downloadErrorLogFile = useCallback(() => {
    if (failedLines.length === 0) return

    const header = 'LOG DE ERROS - IMPORTACAO ECD\n=====================================\n\n'
    const body = failedLines.map((l) => `Linha ${l.lineNumber}: ${l.error}`).join('\n')
    const blob = new Blob([header + body + '\n'], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'erros-importacao.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [failedLines])

  return {
    file,
    progress,
    phase,
    status,
    message,
    uploadedRecords,
    totalRecords,
    uploadedBatches,
    totalBatches,
    speed,
    estimatedTime,
    isValidating,
    validationError,
    validationPassed,
    failedLines,
    isUploading,
    selectFile,
    clearValidation,
    startUpload,
    cancelUpload,
    resetUpload,
    retryUpload,
    downloadErrorLogFile,
  }
}
