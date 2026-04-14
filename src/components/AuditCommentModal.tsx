import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AuditComment,
  saveAuditComment,
  AuditLog,
  getAuditLogsByComment,
  createAuditLog,
} from '@/services/audit_comments'
import pb from '@/lib/pocketbase/client'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export function AuditCommentModal({
  isOpen,
  onClose,
  entry,
  comment,
  projectId,
  userId,
}: {
  isOpen: boolean
  onClose: () => void
  entry: any
  comment: AuditComment | null
  projectId: string
  userId: string
}) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setText(comment?.comment || '')
      setStatus(comment?.status || 'pending')
      if (comment?.id) {
        setIsLoadingLogs(true)
        getAuditLogsByComment(comment.id)
          .then(setLogs)
          .catch(() => toast.error('Erro ao carregar histórico'))
          .finally(() => setIsLoadingLogs(false))
      } else {
        setLogs([])
      }
    }
  }, [isOpen, comment])

  const handleSave = async () => {
    if (!projectId || !userId || !entry) return

    const textToSave = text.trim() || (status !== 'pending' ? 'Revisado' : '')

    if (!textToSave) {
      if (comment?.id) {
        setIsSaving(true)
        try {
          await pb.collection('audit_comments').delete(comment.id)
          toast.success('Comentário removido.')
          onClose()
        } catch {
          toast.error('Erro ao remover.')
        } finally {
          setIsSaving(false)
        }
      } else {
        onClose()
      }
      return
    }

    setIsSaving(true)
    try {
      const isNew = !comment?.id
      const oldStatus = comment?.status
      const oldText = comment?.comment

      const saved = await saveAuditComment({
        id: comment?.id,
        project_id: projectId,
        entry_reference: entry.id,
        comment: textToSave,
        status,
        user_id: userId,
      })

      const actions = []
      if (isNew) {
        actions.push('Comentário Criado')
      } else {
        if (oldText !== textToSave) actions.push('Texto Editado')
        if (oldStatus !== status) {
          actions.push(
            `Status alterado para ${status === 'approved' ? 'Aprovado' : status === 'rejected' ? 'Reprovado' : 'Pendente'}`,
          )
        }
      }

      if (actions.length > 0) {
        await createAuditLog({
          project_id: projectId,
          comment_id: saved.id!,
          user_id: userId,
          action: actions.join(' e '),
          details: isNew
            ? ''
            : `Anterior: ${oldStatus === 'approved' ? 'Aprovado' : oldStatus === 'rejected' ? 'Reprovado' : 'Pendente'} -> Atual: ${status === 'approved' ? 'Aprovado' : status === 'rejected' ? 'Reprovado' : 'Pendente'}`,
        })
      }

      toast.success('Salvo com sucesso!')
      onClose()
    } catch (err) {
      toast.error('Erro ao salvar.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val: boolean) => !val && onClose()}>
      <DialogContent className="sm:max-w-[550px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Comentário de Auditoria</DialogTitle>
          <DialogDescription>
            Adicione ou edite suas observações para este lançamento.
          </DialogDescription>
        </DialogHeader>

        {entry && (
          <div className="text-sm bg-muted/50 p-3 rounded-md border space-y-1.5 shrink-0">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">{entry.data}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conta:</span>
              <span className="font-medium">
                {entry.codigoConta} - {entry.conta}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span
                className={cn('font-medium', entry.dc === 'D' ? 'text-blue-600' : 'text-red-600')}
              >
                {formatNum(entry.valor)} ({entry.dc})
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          <div className="space-y-2">
            <Label htmlFor="audit-comment" className="sr-only">
              Comentário
            </Label>
            <Textarea
              id="audit-comment"
              placeholder="Digite suas observações aqui..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-status">Status da Revisão</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger id="audit-status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Reprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {comment?.id && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Histórico de Alterações</Label>
              {isLoadingLogs ? (
                <div className="text-sm text-muted-foreground animate-pulse">
                  Carregando histórico...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum registro encontrado.</div>
              ) : (
                <ScrollArea className="h-[150px] rounded-md border p-3 bg-muted/20">
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-col space-y-1 text-sm border-b pb-2 last:border-0 last:pb-0 border-border/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {log.expand?.user_id?.name || log.expand?.user_id?.email || 'Usuário'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.created ? format(new Date(log.created), 'dd/MM/yy HH:mm') : ''}
                          </span>
                        </div>
                        <span className="text-foreground">{log.action}</span>
                        {log.details && (
                          <span className="text-xs text-muted-foreground">{log.details}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Comentário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
