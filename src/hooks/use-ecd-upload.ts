import { useState, useCallback, useRef } from 'react'
import { parseAndImportEcd } from '@/lib/ecd-parser'
import { uploadEcdChunk } from '@/services/ecdUploadService'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { downloadErrorLog, type FailedLine } from '@/lib/error-log'
import { toast } from 'sonner'

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error'
export type UploadPhase = 'idle' | 'reading' | 'processing' | 'uploading' | 'completed' | 'error'

const MAX_FILE_SIZE = 100 * 1024 * 1024
const VALIDATION_SLICE_SIZE = 512 * 1024
const VALIDATION_LINE_LIMIT = 2000

async function validateEcdStructure(file: File): Promise<{ valid: boolean; error: string | null }> {
  const text = await file.slice(0, VALIDATION_SLICE_SIZE).text()
  const lines = text.split(/\r?\n/).slice(0, VALIDATION_LINE_LIMIT)
  const hasI001 = lines.some((l) => l.includes('|I001|'))
  const hasI010 = lines.some((l) => l.includes('|I010|'))
  if (!hasI001 || !hasI010)
    return { valid: false, error: 'Arquivo invalido: Registros I001/I010 nao encontrados.' }
  return { valid: true, error: null }
}

export function useEcdUpload(projectId: string | undefined) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [uploadedRecords, setUploadedRecords] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [uploadedBatches, setUploadedBatches] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [speed, setSpeed] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationPassed, setValidationPassed] = useState(false)
  const [failedLines, setFailedLines] = useState<FailedLine[]>([])

  const cancelledRef = useRef(false)
  const startTimeRef = useRef(0)
  const bytesSentRef = useRef(0)
  const recordsSentRef = useRef(0)
  const lastProgressRef = useRef(0)

  const updateProgress = useCallback((p: number) => {
    const now = Date.now()
    if (now - lastProgressRef.current >= 100 || p === 100) {
      lastProgressRef.current = now
      setProgress(p)
    }
  }, [])

  const updateStats = useCallback((recs: number, bytes: number, total: number) => {
    recordsSentRef.current += recs
    bytesSentRef.current += bytes
    setUploadedRecords(recordsSentRef.current)
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    if (elapsed > 0) {
      const rps = recordsSentRef.current / elapsed
      const mbps = bytesSentRef.current / 1024 / 1024 / elapsed
      setSpeed(mbps >= 0.1 ? `${mbps.toFixed(2)} MB/s` : `${rps.toFixed(0)} registros/s`)
      const remaining = total - recordsSentRef.current
      if (rps > 0 && remaining > 0) setEstimatedTime(`${Math.ceil(remaining / rps / 60)} minutos`)
    }
  }, [])

  const selectFile = useCallback(async (f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
    if (ext !== '.txt') {
      setFile(null)
      setStatus('error')
      setMessage('Apenas arquivos .txt sao permitidos.')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setFile(null)
      setStatus('error')
      setMessage('Arquivo excede 100MB.')
      return
    }
    cancelledRef.current = false
    setFile(f)
    setStatus('idle')
    setPhase('idle')
    setMessage('')
    setProgress(0)
    setUploadedRecords(0)
    setTotalRecords(0)
    setUploadedBatches(0)
    setTotalBatches(0)
    setSpeed('')
    setEstimatedTime('')
    setValidationError(null)
    setValidationPassed(false)
    setFailedLines([])
    setIsValidating(true)
    try {
      const r = await validateEcdStructure(f)
      if (cancelledRef.current) return
      if (!r.valid) {
        setValidationError(r.error)
        setValidationPassed(false)
      } else {
        setValidationError(null)
        setValidationPassed(true)
      }
    } catch {
      if (!cancelledRef.current) {
        setValidationError('Erro ao validar arquivo.')
        setValidationPassed(false)
      }
    } finally {
      setIsValidating(false)
    }
  }, [])

  const startUpload = useCallback(async () => {
    if (!file || !projectId || status === 'uploading' || !validationPassed) return
    cancelledRef.current = false
    setStatus('uploading')
    setPhase('reading')
    setProgress(0)
    setMessage('')
    setFailedLines([])
    setUploadedRecords(0)
    setUploadedBatches(0)
    setSpeed('')
    setEstimatedTime('')
    startTimeRef.current = Date.now()
    bytesSentRef.current = 0
    recordsSentRef.current = 0

    const fileId = crypto.randomUUID()
    let batchCount = 0
    let totalRecs = 0

    try {
      const result = await parseAndImportEcd(file, {
        onProgress: (p, ph) => {
          if (cancelledRef.current) return
          updateProgress(p)
          setPhase(ph as UploadPhase)
        },
        onParseComplete: (t) => {
          totalRecs = t.totalAccounts + t.totalEntries
          setTotalRecords(totalRecs)
          setTotalBatches(Math.ceil(t.totalAccounts / 50) + Math.ceil(t.totalEntries / 50))
        },
        onBatch: async (batch) => {
          if (cancelledRef.current) throw new Error('CANCELLED')
          const dataSize = JSON.stringify(batch.data).length
          await uploadEcdChunk(
            projectId,
            fileId,
            batch.action,
            batch.data,
            batch.batchIndex,
            batch.totalBatches,
            () => {
              toast(`Erro ao enviar lote ${batch.batchIndex + 1}. Tentando novamente...`)
            },
          )
          batchCount++
          setUploadedBatches(batchCount)
          updateStats(batch.data.length, dataSize, totalRecs)
        },
      })
      if (cancelledRef.current) return
      updateProgress(100)
      setStatus('completed')
      setPhase('completed')
      setTotalRecords(result.totalAccounts + result.totalEntries)
      setFailedLines(result.failedLines || [])
      if (result.failedLines.length > 0)
        setMessage(
          `${result.totalAccounts} contas e ${result.totalEntries} lancamentos importados. ${result.failedLines.length} linha(s) com erro(s).`,
        )
      else
        setMessage(
          `${result.totalAccounts} contas e ${result.totalEntries} lancamentos importados com sucesso.`,
        )
    } catch (error) {
      if (cancelledRef.current) return
      setStatus('error')
      setPhase('error')
      setMessage(getErrorMessage(error))
      setFailedLines((prev) => [...prev, { lineNumber: 0, error: getErrorMessage(error) }])
    }
  }, [file, projectId, status, validationPassed, updateProgress, updateStats])

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true
    setStatus('idle')
    setPhase('idle')
    setProgress(0)
    setMessage('Upload cancelado.')
    setFailedLines([])
  }, [])
  const resetUpload = useCallback(() => {
    cancelledRef.current = true
    setFile(null)
    setStatus('idle')
    setPhase('idle')
    setMessage('')
    setProgress(0)
    setUploadedRecords(0)
    setTotalRecords(0)
    setUploadedBatches(0)
    setTotalBatches(0)
    setSpeed('')
    setEstimatedTime('')
    setIsValidating(false)
    setValidationError(null)
    setValidationPassed(false)
    setFailedLines([])
  }, [])
  const retryUpload = useCallback(() => {
    startUpload()
  }, [startUpload])
  const downloadErrorLogFile = useCallback(() => {
    if (failedLines.length > 0) downloadErrorLog(failedLines)
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
    isUploading: status === 'uploading',
    selectFile,
    startUpload,
    cancelUpload,
    resetUpload,
    retryUpload,
    downloadErrorLogFile,
  }
}
