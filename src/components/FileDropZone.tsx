import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropZoneProps {
  file: File | null
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  disabled?: boolean
  inputId?: string
  accept?: string
}

export function FileDropZone({
  file,
  onFileSelect,
  onDrop,
  disabled = false,
  inputId = 'ecd-file-input',
  accept = '.txt',
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        file && 'border-solid border-primary/50',
        disabled && 'pointer-events-none opacity-50',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        onDrop(e)
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onFileSelect}
        disabled={disabled}
      />
      <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center">
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {file ? (
            <span className="font-medium text-foreground">{file.name}</span>
          ) : (
            'Arraste o arquivo .txt aqui ou clique para selecionar'
          )}
        </p>
      </label>
    </div>
  )
}
