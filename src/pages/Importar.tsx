import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UploadCloud, FileType2, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useEcdUpload } from '@/hooks/use-ecd-upload'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const tabConfigs = [
  { id: 'ecd', label: 'Upload ECD' },
  { id: 'bank', label: 'Extratos Bancários' },
  { id: 'invoices', label: 'Notas Fiscais' },
] as const

export default function Importar() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
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
  } = useEcdUpload(projectId)

  const [dragState, setDragState] = useState(false)
  const [observations, setObservations] = useState('')

  useEffect(() => {
    if (status === 'completed') {
      toast({ title: 'Sucesso', description: message })
      const timer = setTimeout(() => {
        if (projectId) navigate(`/projects/${projectId}/balancete`)
      }, 1500)
      return () => clearTimeout(timer)
    }
    if (status === 'error') {
      toast({ variant: 'destructive', title: 'Erro na importação', description: message })
    }
  }, [status, message, projectId, navigate, toast])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragState(false)
      const dropped = e.dataTransfer.files?.[0]
      if (dropped) selectFile(dropped)
    },
    [selectFile],
  )

  const statusBadge = () => {
    if (isValidating)
      return (
        <Badge variant="secondary" className="text-sm py-1 px-3">
          Validando estrutura...
        </Badge>
      )
    if (validationError)
      return (
        <Badge variant="destructive" className="text-sm py-1 px-3">
          Inválido
        </Badge>
      )
    if (validationPassed && status === 'idle')
      return (
        <Badge className="text-sm py-1 px-3 bg-green-500 hover:bg-green-500">Pré-validado</Badge>
      )
    if (status === 'completed') return <Badge className="text-sm py-1 px-3">Validado</Badge>
    if (status === 'uploading')
      return (
        <Badge variant="secondary" className="text-sm py-1 px-3">
          Em processamento
        </Badge>
      )
    if (status === 'error')
      return (
        <Badge variant="destructive" className="text-sm py-1 px-3">
          Erro
        </Badge>
      )
    return (
      <Badge variant="outline" className="text-sm py-1 px-3">
        Aguardando
      </Badge>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Importar Dados</h2>
        <p className="text-muted-foreground mt-1">
          Faça o upload e validação de seus arquivos em categorias específicas.
        </p>
      </div>

      <Tabs defaultValue="ecd" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {tabConfigs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ecd" className="mt-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragState(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setDragState(false)
                }}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors',
                  dragState
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  file && 'border-primary/50 bg-primary/5',
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
                    {status === 'idle' && (
                      <Button variant="outline" size="sm" onClick={resetUpload}>
                        <X className="mr-2 h-4 w-4" /> Remover
                      </Button>
                    )}
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
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) selectFile(f)
                          e.target.value = ''
                        }}
                      />
                      <Button variant="secondary">Procurar Arquivo</Button>
                    </div>
                  </>
                )}
              </div>

              {isValidating && (
                <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-muted text-muted-foreground animate-fade-in">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Validando estrutura do arquivo ECD...</span>
                </div>
              )}

              {validationError && !isValidating && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {validationPassed && !isValidating && !validationError && status === 'idle' && (
                <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-green-500/10 text-green-600 dark:text-green-400 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Estrutura ECD validada com sucesso. Pronto para processar.</span>
                </div>
              )}

              {message && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-3 text-sm animate-fade-in',
                    status === 'error'
                      ? 'bg-destructive/10 text-destructive'
                      : status === 'completed'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {status === 'error' ? (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : null}
                  <span>{message}</span>
                </div>
              )}

              {status === 'uploading' && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processando arquivo...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {(totalRecords > 0 || uploadedRecords > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {uploadedRecords} / {totalRecords} registros
                      {estimatedTime ? ` · ${estimatedTime}` : ''}
                    </p>
                  )}
                </div>
              )}

              {file && (
                <div className="grid sm:grid-cols-2 gap-6 border-t pt-6">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      Validação Automática
                    </div>
                    {statusBadge()}
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Observações</div>
                    <Textarea
                      placeholder="Adicione notas sobre a importação..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      disabled={status === 'uploading'}
                      className="resize-none h-24"
                    />
                  </div>
                </div>
              )}

              {file && (
                <div className="flex justify-between pt-4 border-t">
                  {status === 'uploading' ? (
                    <Button variant="outline" onClick={cancelUpload}>
                      Cancelar
                    </Button>
                  ) : isValidating ? (
                    <Button variant="outline" onClick={resetUpload}>
                      <X className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                  ) : (
                    <div />
                  )}
                  {status === 'uploading' ? (
                    <Button disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                    </Button>
                  ) : status === 'completed' ? (
                    <Button disabled>Processado</Button>
                  ) : (
                    <Button
                      onClick={startUpload}
                      disabled={isValidating || !validationPassed || !!validationError}
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...
                        </>
                      ) : (
                        'Processar'
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center py-8">
                Upload de extratos bancários em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center py-8">
                Upload de notas fiscais em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
