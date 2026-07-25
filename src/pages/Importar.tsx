import { useParams, Link } from 'react-router-dom'
import { useEcdUpload } from '@/hooks/use-ecd-upload'
import { useEcdImport } from '@/hooks/use-ecd-import'
import { EcdUploadProgress } from '@/components/EcdUploadProgress'
import { FileDropZone } from '@/components/FileDropZone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Upload, FileText, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function Importar() {
  const { projectId } = useParams<{ projectId: string }>()
  const {
    file: uploadFile,
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
    selectFile: selectUploadFile,
    startUpload,
    cancelUpload,
    resetUpload,
    retryUpload,
    downloadErrorLogFile,
  } = useEcdUpload(projectId)

  const { file, selectFile, error, clearFile } = useEcdImport()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      selectUploadFile(selected)
      selectFile(selected)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      selectUploadFile(dropped)
      selectFile(dropped)
    }
  }

  const showProgress = isUploading || status === 'completed' || status === 'error'

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Importar ECD</h1>
          <p className="text-sm text-muted-foreground">
            Faça o upload do arquivo .txt da ECD para importar os dados contábeis.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arquivo ECD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropZone
            file={uploadFile}
            onFileSelect={handleFileSelect}
            onDrop={handleDrop}
            disabled={isUploading}
            inputId="ecd-file-input"
            accept=".txt"
          />

          {file && (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado:{' '}
                <span className="font-medium text-foreground">{file.name}</span>
              </p>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                Limpar
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Validando estrutura do arquivo...
            </div>
          )}

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Arquivo inválido</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {validationPassed && !validationError && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Arquivo válido</AlertTitle>
              <AlertDescription>
                A estrutura ECD foi reconhecida. Clique em "Iniciar Importação" para continuar.
              </AlertDescription>
            </Alert>
          )}

          {uploadFile &&
            validationPassed &&
            !isUploading &&
            status !== 'completed' &&
            phase !== 'error' && (
              <Button onClick={startUpload} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Iniciar Importação
              </Button>
            )}

          {showProgress && (
            <EcdUploadProgress
              progress={progress}
              phase={phase}
              message={message}
              uploadedRecords={uploadedRecords}
              totalRecords={totalRecords}
              uploadedBatches={uploadedBatches}
              totalBatches={totalBatches}
              speed={speed}
              estimatedTime={estimatedTime}
              onCancel={cancelUpload}
              onRetry={retryUpload}
              failedLines={failedLines}
              onDownloadErrorLog={downloadErrorLogFile}
            />
          )}

          {status === 'completed' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetUpload} className="flex-1">
                Novo Upload
              </Button>
              {projectId && (
                <Button variant="outline" asChild className="flex-1">
                  <Link to={`/projects/${projectId}/balancete`}>Ver Balancete</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
