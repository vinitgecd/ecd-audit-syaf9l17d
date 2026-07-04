import { useState, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { parseAndImportEcd } from '@/lib/ecd-parser'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error'

const MAX_FILE_SIZE = 100 * 1024 * 1024
const VALIDATION_SLICE_SIZE = 512 * 1024
const VALIDATION_LINE_LIMIT = 2000

const REQUIRED_MARKER_ERROR =
  'Arquivo inválido: Estrutura ECD não reconhecida (Registros obrigatórios I001/I010 não encontrados).'

async function validateEcdStructure(file: File): Promise<{ valid: boolean; error: string | null }> {
  const text = await file.slice(0, VALIDATION_SLICE_SIZE).text()
  const lines = text.split(/\r?\n/).slice(0, VALIDATION_LINE_LIMIT)
  const hasI001 = lines.some((line) => line.includes('|I001|'))
  const hasI010 = lines.some((line) => line.includes('|I010|'))

  if (!hasI001 || !hasI010) {
    return { valid: false, error: REQUIRED_MARKER_ERROR }
  }
  return { valid: true, error: null }
}

export function useEcdUpload(projectId: string | undefined) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [uploadedRecords, setUploadedRecords] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationPassed, setValidationPassed] = useState(false)
  const cancelledRef = useRef(false)

  const selectFile = useCallback(async (selectedFile: File) => {
    const dotIdx = selectedFile.name.lastIndexOf('.')
    const ext = dotIdx >= 0 ? selectedFile.name.substring(dotIdx).toLowerCase() : ''
    if (ext !== '.txt') {
      setFile(null)
      setStatus('error')
      setMessage('Apenas arquivos .txt são permitidos para importação ECD.')
      setValidationError(null)
      setValidationPassed(false)
      return
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setStatus('error')
      setMessage('O arquivo excede o limite máximo de 100MB.')
      setValidationError(null)
      setValidationPassed(false)
      return
    }

    cancelledRef.current = false
    setFile(selectedFile)
    setStatus('idle')
    setMessage('')
    setProgress(0)
    setUploadedRecords(0)
    setTotalRecords(0)
    setEstimatedTime('')
    setValidationError(null)
    setValidationPassed(false)
    setIsValidating(true)

    try {
      const result = await validateEcdStructure(selectedFile)
      if (cancelledRef.current) return
      if (!result.valid) {
        setValidationError(result.error)
        setValidationPassed(false)
      } else {
        setValidationError(null)
        setValidationPassed(true)
      }
    } catch {
      if (cancelledRef.current) return
      setValidationError('Erro ao validar a estrutura do arquivo.')
      setValidationPassed(false)
    } finally {
      setIsValidating(false)
    }
  }, [])

  const startUpload = useCallback(async () => {
    if (!file || !projectId || status === 'uploading' || !validationPassed) return

    cancelledRef.current = false
    setStatus('uploading')
    setProgress(0)
    setMessage('Iniciando processamento...')

    try {
      const result = await parseAndImportEcd(file, projectId, pb, (p) => {
        if (cancelledRef.current) return
        setProgress(p)
      })

      if (cancelledRef.current) return

      setProgress(100)
      setStatus('completed')
      setTotalRecords(result.entriesCount)
      setUploadedRecords(result.entriesCount)
      setMessage(
        `${result.accountsCount} contas e ${result.entriesCount} lançamentos importados com sucesso.`,
      )
    } catch (error) {
      if (cancelledRef.current) return
      setStatus('error')
      setMessage(getErrorMessage(error))
    }
  }, [file, projectId, status, validationPassed])

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true
    setStatus('idle')
    setProgress(0)
    setMessage('Upload cancelado.')
  }, [])

  const resetUpload = useCallback(() => {
    cancelledRef.current = true
    setFile(null)
    setStatus('idle')
    setMessage('')
    setProgress(0)
    setUploadedRecords(0)
    setTotalRecords(0)
    setEstimatedTime('')
    setIsValidating(false)
    setValidationError(null)
    setValidationPassed(false)
  }, [])

  return {
    file,
    progress,
    status,
    message,
    uploadedRecords,
    totalRecords,
    estimatedTime,
    isValidating,
    validationError,
    validationPassed,
    selectFile,
    startUpload,
    cancelUpload,
    resetUpload,
  }
}
