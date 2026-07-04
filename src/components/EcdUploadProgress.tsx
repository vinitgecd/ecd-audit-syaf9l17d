import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Loader2, Upload, X } from 'lucide-react'

type UploadStatus = 'idle' | 'processing' | 'uploading' | 'success' | 'error'

interface EcdUploadProgressProps {
  progress: number
  status: UploadStatus
  message: string
  uploadedRecords: number
  totalRecords: number
  estimatedTime: string
  onCancel: () => void
}

const statusConfig: Record<
  UploadStatus,
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
  processing: {
    label: 'Processando',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: Loader2,
    spin: true,
  },
  uploading: {
    label: 'Enviando',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: Upload,
    spin: false,
  },
  success: {
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
  status,
  message,
  uploadedRecords,
  totalRecords,
  estimatedTime,
  onCancel,
}: EcdUploadProgressProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const isActive = status === 'processing' || status === 'uploading'

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
            <X className="mr-1 h-3 w-3" />
            Cancelar
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Progress
          value={progress}
          className={cn(
            'h-3',
            status === 'success' && '[&>div]:bg-green-500',
            status === 'error' && '[&>div]:bg-red-500',
          )}
        />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">{progress}%</span>
          {isActive && (
            <span className="text-muted-foreground">
              {uploadedRecords} de {totalRecords} registros enviados
            </span>
          )}
        </div>
      </div>

      {isActive && estimatedTime && (
        <p className="text-sm text-muted-foreground">Tempo estimado: {estimatedTime}</p>
      )}

      {message && (
        <p
          className={cn(
            'text-sm font-medium',
            status === 'error' ? 'text-red-500' : 'text-green-500',
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
