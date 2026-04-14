import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { UploadCloud, FileType2, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type TabKey = 'ecd' | 'bank' | 'invoices'
type FileStatus = 'idle' | 'processing' | 'validated'

interface TabState {
  file: File | null
  status: FileStatus
  progress: number
  observations: string
}

const tabConfigs: { id: TabKey; label: string }[] = [
  { id: 'ecd', label: 'Upload ECD' },
  { id: 'bank', label: 'Upload de extratos bancários' },
  { id: 'invoices', label: 'Upload Notas Fiscais' },
]

export default function Import() {
  const { toast } = useToast()
  const [dragState, setDragState] = useState<string | null>(null)
  const [tabs, setTabs] = useState<Record<TabKey, TabState>>({
    ecd: { file: null, status: 'idle', progress: 0, observations: '' },
    bank: { file: null, status: 'idle', progress: 0, observations: '' },
    invoices: { file: null, status: 'idle', progress: 0, observations: '' },
  })

  const updateTab = useCallback((id: TabKey, data: Partial<TabState>) => {
    setTabs((prev) => ({ ...prev, [id]: { ...prev[id], ...data } }))
  }, [])

  const handleFile = useCallback(
    (id: TabKey, file: File) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (ext !== '.txt' && ext !== '.csv') {
        toast({
          variant: 'destructive',
          title: 'Formato inválido',
          description: 'Apenas arquivos .txt e .csv são permitidos.',
        })
        return
      }
      updateTab(id, { file, status: 'idle', progress: 0 })
    },
    [toast, updateTab],
  )

  const handleProcess = useCallback(
    (id: TabKey) => {
      const state = tabs[id]
      if (!state.file || state.status !== 'idle') return

      updateTab(id, { status: 'processing', progress: 0 })

      const interval = setInterval(() => {
        setTabs((prev) => {
          const curr = prev[id]
          if (curr.progress >= 100) {
            clearInterval(interval)
            toast({ title: 'Sucesso', description: `${curr.file?.name} foi validado com sucesso.` })
            return { ...prev, [id]: { ...curr, status: 'validated', progress: 100 } }
          }
          return { ...prev, [id]: { ...curr, progress: curr.progress + 20 } }
        })
      }, 400)
    },
    [tabs, toast, updateTab],
  )

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

        {tabConfigs.map(({ id }) => {
          const state = tabs[id]
          return (
            <TabsContent key={id} value={id} className="mt-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragState(id)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setDragState(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragState(null)
                      if (e.dataTransfer.files?.[0]) handleFile(id, e.dataTransfer.files[0])
                    }}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors',
                      dragState === id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50',
                      state.file && 'border-primary/50 bg-primary/5',
                    )}
                  >
                    {state.file ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="p-3 bg-background rounded-full shadow-sm border">
                          <FileType2 className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-lg">{state.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(state.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {state.status === 'idle' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateTab(id, { file: null })}
                          >
                            Remover
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
                          Suporta apenas arquivos .txt e .csv
                        </p>
                        <div className="relative">
                          <Input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept=".txt,.csv"
                            onChange={(e) =>
                              e.target.files?.[0] && handleFile(id, e.target.files[0])
                            }
                          />
                          <Button variant="secondary">Procurar Arquivo</Button>
                        </div>
                      </>
                    )}
                  </div>

                  {state.file && (
                    <div className="space-y-6">
                      {state.status === 'processing' && (
                        <div className="space-y-2 animate-fade-in">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Processando arquivo...</span>
                            <span className="font-medium">{state.progress}%</span>
                          </div>
                          <Progress value={state.progress} className="h-2" />
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-6 border-t pt-6">
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-muted-foreground">
                            Validação Automática
                          </div>
                          <Badge
                            variant={
                              state.status === 'validated'
                                ? 'default'
                                : state.status === 'processing'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-sm py-1 px-3"
                          >
                            {state.status === 'validated'
                              ? 'Validado'
                              : state.status === 'processing'
                                ? 'Em processamento'
                                : 'Aguardando'}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-medium text-muted-foreground">
                            Observações
                          </div>
                          <Textarea
                            placeholder="Adicione notas sobre a importação..."
                            value={state.observations}
                            onChange={(e) => updateTab(id, { observations: e.target.value })}
                            disabled={state.status !== 'idle'}
                            className="resize-none h-24"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t">
                        <Button
                          onClick={() => handleProcess(id)}
                          disabled={state.status !== 'idle'}
                        >
                          {state.status === 'processing' && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {state.status === 'validated' ? 'Processado' : 'Processar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
