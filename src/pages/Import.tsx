import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadCloud, FileType2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function Import() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFile = (selectedFile: File) => {
    const validTypes = [
      'text/xml',
      'application/xml',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
    ]
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Apenas arquivos XML, XLSX ou PDF são permitidos para ECD.',
      })
      return
    }
    setFile(selectedFile)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleProcess = () => {
    if (!file) return
    setUploading(true)
    setProgress(0)

    // Simulate upload and processing
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)
          toast({
            title: 'Importação concluída',
            description: `${file.name} foi processado com sucesso.`,
          })
          setFile(null)
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Importar Dados</h2>
        <p className="text-muted-foreground mt-1">
          Faça o upload do arquivo da Escrituração Contábil Digital (ECD) ou planilhas auxiliares.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
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
                {!uploading && (
                  <Button variant="outline" size="sm" onClick={() => setFile(null)}>
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
                  Suporta arquivos .txt (ECD), .xml, .xlsx e .pdf até 50MB
                </p>
                <div className="relative">
                  <Input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".txt,.xml,.xlsx,.pdf"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                  />
                  <Button variant="secondary">Procurar Arquivo</Button>
                </div>
              </>
            )}
          </div>

          {file && (
            <div className="mt-6 space-y-4">
              {uploading && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processando arquivo...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleProcess} disabled={uploading || progress === 100}>
                  {uploading ? 'Processando...' : 'Iniciar Importação'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Tipos Suportados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Arquivos TXT gerados pelo validador da Receita Federal (PVA), balancetes em Excel ou
            notas fiscais em PDF e XML.
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Validação Automática
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            O sistema validará automaticamente saldos, integridade das contas e cruzamentos básicos
            do SPED.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
