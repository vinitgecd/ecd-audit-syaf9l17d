import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getAuditCommentsByProject, AuditComment } from '@/services/audit_comments'
import { EntryItem, Account } from '@/services/accounting'
import { AuditCommentModal } from '@/components/AuditCommentModal'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2, AlertCircle, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export default function Pending() {
  const { user } = useAuth()
  const { projectId } = useParams()

  const [comments, setComments] = useState<AuditComment[]>([])
  const [entriesMap, setEntriesMap] = useState<Record<string, EntryItem>>({})
  const [loading, setLoading] = useState(true)

  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [selectedComment, setSelectedComment] = useState<AuditComment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadData = async (id: string) => {
    try {
      const comms = await getAuditCommentsByProject(id)
      setComments(comms)

      const pendingComms = comms.filter((c) => c.status === 'pending' || c.status === 'rejected')

      if (pendingComms.length > 0) {
        const itemIds = pendingComms.map((c) => c.entry_reference)
        // Split IDs into chunks to avoid too long query strings if many
        const itemsList = await pb.collection('entry_items').getFullList<EntryItem>({
          filter: itemIds.map((id) => `id="${id}"`).join('||'),
          expand: 'entry_id,account_id',
        })

        const eMap: Record<string, EntryItem> = {}
        itemsList.forEach((i) => (eMap[i.id] = i))
        setEntriesMap(eMap)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) loadData(projectId)
  }, [projectId])

  useRealtime(
    'audit_comments',
    (e) => {
      if (e.record.project_id !== projectId) return
      if (e.action === 'create' || e.action === 'update' || e.action === 'delete') {
        loadData(projectId!)
      }
    },
    !!projectId,
  )

  const pendingComments = comments.filter((c) => c.status === 'pending' || c.status === 'rejected')

  const rows = pendingComments
    .map((c) => {
      const realItem = entriesMap[c.entry_reference]
      if (realItem) {
        return {
          comment: c,
          entry: {
            id: realItem.id,
            data: realItem.expand?.entry_id?.date
              ? format(parseISO(realItem.expand.entry_id.date), 'dd/MM/yyyy')
              : '',
            codigoConta: realItem.expand?.account_id?.code || '',
            conta: realItem.expand?.account_id?.name || '',
            valor: realItem.value,
            dc: realItem.type === 'debit' ? 'D' : 'C',
          },
        }
      }
      return null
    })
    .filter(Boolean)

  const handleEdit = (row: any) => {
    setSelectedEntry(row.entry)
    setSelectedComment(row.comment)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            Relatório de Pendências
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie lançamentos de auditoria com status Pendente ou Reprovado.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos Aguardando Ação</CardTitle>
          <CardDescription>
            {rows.length} {rows.length === 1 ? 'item requer' : 'itens requerem'} sua atenção neste
            projeto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead className="w-[250px]">Conta</TableHead>
                  <TableHead className="text-right w-[120px]">Valor</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[60px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /> Carregando pendências...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 text-green-500 mx-auto mb-3 opacity-50" />
                      Nenhuma pendência encontrada neste projeto. Ótimo trabalho!
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: any) => (
                    <TableRow key={row.comment.id}>
                      <TableCell className="whitespace-nowrap">{row.entry.data}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={`${row.entry.codigoConta} - ${row.entry.conta}`}
                      >
                        <span className="font-mono text-xs mr-2">{row.entry.codigoConta}</span>
                        {row.entry.conta}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span
                          className={cn(
                            'font-medium',
                            row.entry.dc === 'D' ? 'text-blue-600' : 'text-red-600',
                          )}
                        >
                          {formatNum(row.entry.valor)}{' '}
                          <span className="text-xs">{row.entry.dc}</span>
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={row.comment.comment}>
                        {row.comment.comment}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.comment.status === 'rejected' ? 'destructive' : 'outline'}
                          className={cn(
                            row.comment.status === 'pending' &&
                              'border-yellow-500 text-yellow-600 bg-yellow-50/50',
                          )}
                        >
                          {row.comment.status === 'rejected' ? 'Reprovado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(row)}
                          title="Editar Comentário"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AuditCommentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entry={selectedEntry}
        comment={selectedComment}
        projectId={projectId!}
        userId={user?.id!}
      />
    </div>
  )
}
