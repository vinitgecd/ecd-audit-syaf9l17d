import { useEffect, useState } from 'react'
import { getDocuments, createDocument, getFileUrl, Document } from '@/services/documents'
import { getProjects, Project } from '@/services/projects'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  FileText,
  FileSpreadsheet,
  FileIcon,
  Search,
  Upload,
  Download,
  Trash2,
  Eye,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      const [docsData, projsData] = await Promise.all([
        getDocuments(selectedProject === 'all' ? undefined : selectedProject),
        getProjects(),
      ])
      setDocuments(docsData)
      setProjects(projsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedProject])

  useRealtime('documents', () => {
    fetchData()
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (selectedProject === 'all') {
      toast({
        variant: 'destructive',
        title: 'Atenção',
        description: 'Selecione um projeto antes de fazer upload.',
      })
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)
    formData.append('project_id', selectedProject)
    formData.append('type', file.type)

    try {
      await createDocument(formData)
      toast({ title: 'Sucesso', description: 'Documento anexado ao projeto.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no upload', description: err.message })
    }
  }

  const getIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
    if (type.includes('spreadsheet') || type.includes('excel'))
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />
    return <FileIcon className="h-8 w-8 text-blue-500" />
  }

  const filteredDocs = documents.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Documentos Fiscais</h2>
          <p className="text-muted-foreground mt-1">
            Repositório centralizado de arquivos comprobatórios.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-elevation">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex w-full md:w-auto items-center gap-3 flex-wrap">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-full md:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documento..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <Input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleUpload}
                disabled={selectedProject === 'all'}
                title={selectedProject === 'all' ? 'Selecione um projeto primeiro' : 'Fazer Upload'}
              />
              <Button disabled={selectedProject === 'all'} className="gap-2">
                <Upload className="h-4 w-4" />
                Fazer Upload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">
              Carregando documentos...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg bg-muted/20">
              <FileIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum documento encontrado
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Faça upload de arquivos ou altere seus filtros.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative flex flex-col p-4 border rounded-xl bg-card hover:shadow-md transition-all hover:border-primary/30"
                >
                  <div className="flex justify-between items-start mb-3">
                    {getIcon(doc.type)}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1 border shadow-sm absolute right-2 top-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={getFileUrl(doc)} download target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-medium text-sm line-clamp-2 mt-auto" title={doc.name}>
                    {doc.name}
                  </h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
                    <span>{format(new Date(doc.created), 'dd/MM/yyyy')}</span>
                    <span
                      className="truncate max-w-[100px]"
                      title={projects.find((p) => p.id === doc.project_id)?.name}
                    >
                      {projects.find((p) => p.id === doc.project_id)?.name || 'Projeto'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-muted/30 rounded-md overflow-hidden border">
            {previewDoc?.type.includes('pdf') ? (
              <iframe
                src={previewDoc ? getFileUrl(previewDoc) : ''}
                className="w-full h-full"
                title={previewDoc.name}
              />
            ) : (
              <div className="flex items-center justify-center h-full flex-col gap-4">
                <FileIcon className="h-16 w-16 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Visualização não disponível para este formato.
                </p>
                <Button asChild>
                  <a
                    href={previewDoc ? getFileUrl(previewDoc) : ''}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fazer Download do Arquivo
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
