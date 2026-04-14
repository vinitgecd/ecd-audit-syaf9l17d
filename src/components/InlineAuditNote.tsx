import { useState, useEffect } from 'react'
import { Check, Loader2, X, Edit3 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { saveAuditComment, deleteAuditComment, AuditComment } from '@/services/audit_comments'
import { cn } from '@/lib/utils'

interface InlineAuditNoteProps {
  projectId: string
  entryReference: string
  userId: string
  comment: AuditComment | null
}

export function InlineAuditNote({
  projectId,
  entryReference,
  userId,
  comment,
}: InlineAuditNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(comment?.comment || '')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!isEditing) {
      setValue(comment?.comment || '')
    }
  }, [comment, isEditing])

  const handleSave = async () => {
    const trimmedValue = value.trim()

    if (trimmedValue === (comment?.comment || '').trim()) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)

    try {
      if (!trimmedValue) {
        if (comment?.id) {
          await deleteAuditComment(comment.id)
          toast({
            title: 'Nota removida',
            description: 'A nota de auditoria foi removida.',
          })
        }
        setIsEditing(false)
        return
      }

      await saveAuditComment({
        id: comment?.id,
        project_id: projectId,
        entry_reference: entryReference,
        comment: trimmedValue,
        user_id: userId,
        status: comment?.status || 'pending',
      })
      toast({
        title: 'Nota salva',
        description: 'A nota de auditoria foi salva com sucesso.',
      })
      setIsEditing(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar a nota de auditoria.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
      setValue(comment?.comment || '')
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (e.relatedTarget && e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
      return
    }
    handleSave()
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="min-h-[60px] text-xs resize-y bg-background"
          placeholder="Digite a nota de auditoria..."
          autoFocus
          disabled={isLoading}
        />
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setIsEditing(false)
              setValue(comment?.comment || '')
            }}
            disabled={isLoading}
            title="Cancelar (Esc)"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-6 w-6"
            onClick={handleSave}
            disabled={isLoading}
            title="Salvar (Ctrl+Enter)"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative flex min-h-[40px] w-full cursor-text items-start rounded-md border border-transparent p-2 text-sm transition-colors hover:border-border hover:bg-muted/50',
        !comment?.comment &&
          'text-muted-foreground italic items-center justify-center bg-muted/20 hover:bg-muted/40',
        comment?.comment && 'bg-blue-50/50 dark:bg-blue-900/10',
      )}
      onClick={() => setIsEditing(true)}
    >
      <div className="flex-1 whitespace-pre-wrap break-words text-xs w-full text-left">
        {comment?.comment || 'Adicionar nota...'}
      </div>
      <Edit3 className="absolute right-2 top-2 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground" />
    </div>
  )
}
