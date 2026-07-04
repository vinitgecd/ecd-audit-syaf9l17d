import { useState, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { parseAndImportEcd } from '@/lib/ecd-parser'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error'

const MAX_FILE_SIZE = 100 * 1024 * 1024

export function useEcdUpload(projectId: string | undefined) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [uploadedRecords, setUploadedRecords] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState('')
  const cancelledRef = useRef(false)

  const selectFile = useCallback((selectedFile: File) => {
    const dotIdx = selectedFile.name.lastIndexOf('.')
    const ext = dotIdx >= 0 ? selectedFile.name.substring(dotIdx).toLowerCase() : ''
    if (ext !== '.txt') {
      setFile(null)
      setStatus('error')
      setMessage('Apenas arquivos .txt são permitidos para importação ECD.')
      return
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setStatus('error')
      setMessage('O arquivo excede o limite máximo de 100MB.')
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
  }, [])

  const startUpload = useCallback(async () => {
    if (!file || !projectId || status === 'uploading') return

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
  }, [file, projectId, status])

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
  }, [])

  return {
    file,
    progress,
    status,
    message,
    uploadedRecords,
    totalRecords,
    estimatedTime,
    selectFile,
    startUpload,
    cancelUpload,
    resetUpload,
  }
}
