import { useState, useCallback } from 'react'

const MAX_FILE_SIZE = 50 * 1024 * 1024

export function useEcdImport() {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearValidation = useCallback(() => {
    setError(null)
  }, [])

  const selectFile = useCallback(
    (selectedFile: File) => {
      clearValidation()
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError('Arquivo muito grande. Tamanho maximo: 50MB.')
        return
      }
      if (!selectedFile.name.toLowerCase().endsWith('.txt')) {
        setError('Formato invalido. Selecione um arquivo .txt.')
        return
      }
      setFile(selectedFile)
    },
    [clearValidation],
  )

  const clearFile = useCallback(() => {
    setFile(null)
    setError(null)
  }, [])

  return { file, selectFile, error, clearFile, clearValidation }
}
