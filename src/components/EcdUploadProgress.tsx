import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Loader2, Upload, X, Download, RotateCcw } from 'lucide-react'
import type { UploadPhase } from '@/hooks/use-ecd-upload'

interface FailedLine {
  lineNumber: number
  error: string
}

interface EcdUploadProgressProps {
  progress: number
  phase: UploadPhase
  message: string
  uploadedRecords: number
  totalRecords: number
  uploadedBatches: number
  totalBatches: number
  speed: string
  estimatedTime: string
  onCancel: () => void
  onRetry: () => void
  failedLines?: FailedLine[]
  onDownloadErrorLog?: () => void
}

const phaseConfig: Record<
  UploadPhase,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    color: string
    icon: typeof Loader2
    spin: boolean
  }
> = {
  idle: {
    label: 'Aguardando',
    variant: 'outline',
    color: 'text-muted-foreground',
    icon: Loader2,
    spin: false,
  },
  reading: {
    label: 'Lendo arquivo...',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: Loader2,
    spin: true,
  },
  processing: {
    label: 'Processando...',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: Loader2,
    spin: true,
  },
  uploading: {
    label: 'Enviando...',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: Upload,
    spin: false,
  },
  completed: {
    label: 'Concluído',
    variant: 'default',
    color: 'text-green-500',
    icon: CheckCircle,
    spin: false,
  },
  error: {
    label: 'Erro',
    variant: 'destructive',
    color: 'text-red-500',
    icon: XCircle,
    spin: false,
  },
}

export function EcdUploadProgress({
  progress,
  phase,
  message,
  uploadedRecords,
  totalRecords,
  uploadedBatches,
  totalBatches,
  speed,
  estimatedTime,
  onCancel,
  onRetry,
  failedLines,
  onDownloadErrorLog,
}: EcdUploadProgressProps) {
  const config = phaseConfig[phase]
  const Icon = config.icon
  const isActive = phase === 'reading' || phase === 'processing' || phase === 'uploading'
  const hasErrors =
    (phase === 'error' || (failedLines != null && failedLines.length > 0)) && !!onDownloadErrorLog

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', config.color, config.spin && 'animate-spin')} />
          <Badge variant={config.variant} className="text-sm">
            {config.label}
          </Badge>
        </div>
        {isActive && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="mr-1 h-3 w-3" /> Cancelar
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Progress
          value={progress}
          className={cn(
            'h-3',
            phase === 'completed' && '[&>div]:bg-green-500',
            phase === 'error' && '[&>div]:bg-red-500',
          )}
        />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">{progress}%</span>
          {isActive && speed && <span className="text-muted-foreground">{speed}</span>}
        </div>
      </div>

      {isActive && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">Registros: </span>
            <span className="font-medium">
              {uploadedRecords} de {totalRecords}
            </span>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">Lotes: </span>
            <span className="font-medium">
              {uploadedBatches} de {totalBatches}
            </span>
          </div>
        </div>
      )}

      {isActive && estimatedTime && (
        <p className="text-sm text-muted-foreground">Tempo estimado: {estimatedTime}</p>
      )}

      {hasErrors && (
        <Button variant="outline" size="sm" onClick={onDownloadErrorLog}>
          <Download className="mr-1 h-3 w-3" /> Baixar Log de Erros
        </Button>
      )}

      {message && (
        <p
          className={cn(
            'text-sm font-medium',
            phase === 'error'
              ? 'text-red-500'
              : phase === 'completed'
                ? 'text-green-500'
                : 'text-muted-foreground',
          )}
        >
          {message}
        </p>
      )}

      {phase === 'error' && (
        <Button onClick={onRetry} className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" /> Tentar Novamente
        </Button>
      )}
    </div>
  )
}
