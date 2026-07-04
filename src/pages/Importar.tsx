import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UploadCloud, FileType2, RefreshCw } from 'lucide-react'
import { useEcdUpload } from '@/hooks/use-ecd-upload'
import { EcdUploadProgress } from '@/components/EcdUploadProgress'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function Importar() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [observations, setObservations] = useState('')
  const successHandled = useRef(false)

  const {
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
    retry,
  } = useEcdUpload()

  useEffect(() => {
    if (status === 'success' && !successHandled.current) {
      successHandled.current = true
      toast({
        title: 'Sucesso',
        description: `Arquivo processado com sucesso! ${uploadedRecords} registros importados.`,
      })
      const timer = setTimeout(() => {
        navigate(`/projects/${projectId}/balancete`)
      }, 2000)
      return () => clearTimeout(timer)
    }
    if (status !== 'success') {
      successHandled.current = false
    }
  }, [status, uploadedRecords, navigate, projectId, toast])

  const handleProcess = async () => {
    if (!projectId || !file) return
    await startUpload(projectId)
  }

  const handleCancel = () => {
    if (window.confirm('Cancelar upload?')) {
      cancelUpload()
    }
  }

  const isActive = status === 'processing' || status === 'uploading'
  const showFileInput = !isActive && status !== 'success'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Importar ECD</h2>
        <p className="text-muted-foreground mt-1">
          Faça o upload do arquivo SPED ECD para processamento automático.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {showFileInput && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.[0]) selectFile(e.dataTransfer.files[0])
                }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors',
                  file ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                {file ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-3 bg-background rounded-full shadow-sm border">
                      <FileType2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetUpload}>
                      Trocar arquivo
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">Arraste e solte seu arquivo aqui</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-6">
                      Suporta apenas arquivos .txt (máx. 100MB)
                    </p>
                    <div className="relative">
                      <Input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".txt"
                        onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])}
                      />
                      <Button variant="secondary">Procurar Arquivo</Button>
                    </div>
                  </>
                )}
              </div>

              {file && status === 'error' && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-sm text-red-500 font-medium">{message}</p>
                  <Button variant="outline" onClick={retry}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Tentar novamente
                  </Button>
                </div>
              )}

              {!file && status === 'error' && message && (
                <p className="text-sm text-red-500 font-medium text-center">{message}</p>
              )}

              {file && status === 'idle' && (
                <div className="space-y-6 border-t pt-6">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Observações</div>
                    <Textarea
                      placeholder="Adicione notas sobre a importação..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="resize-none h-24"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleProcess} disabled={!file}>
                      Processar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {isActive && (
            <EcdUploadProgress
              progress={progress}
              status={status}
              message={message}
              uploadedRecords={uploadedRecords}
              totalRecords={totalRecords}
              estimatedTime={estimatedTime}
              onCancel={handleCancel}
            />
          )}

          {status === 'success' && (
            <EcdUploadProgress
              progress={progress}
              status={status}
              message={message}
              uploadedRecords={uploadedRecords}
              totalRecords={totalRecords}
              estimatedTime={estimatedTime}
              onCancel={() => {}}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
