import { useState, useEffect, useCallback } from 'react'
import { FileText, Loader2, Clock } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getEcdDocuments, type ProjectDocument } from '@/services/documents'
import { useRealtime } from '@/hooks/use-realtime'

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export function ImportHistory({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const docs = await getEcdDocuments(projectId)
      setDocuments(docs)
    } catch (err) {
      console.error('Error loading import history:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  useRealtime('documents', () => {
    loadData()
  })

  return (
    <div className="flex flex-col bg-card rounded-lg border shadow-sm w-full lg:w-72 shrink-0">
      <div className="flex items-center gap-2 p-3 border-b">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Histórico de Importações</h3>
      </div>
      <ScrollArea className="flex-1 max-h-[250px] lg:max-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-6">
            Nenhum arquivo importado encontrado
          </p>
        ) : (
          <ul className="divide-y">
            {documents.map((doc) => (
              <li key={doc.id} className="p-3 hover:bg-muted/50 transition-colors animate-fade-in">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground truncate" title={doc.name}>
                      {doc.name}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(doc.created)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
