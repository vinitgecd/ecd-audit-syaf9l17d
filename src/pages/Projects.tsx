import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import pb from '@/lib/pocketbase/client'
import { AuditComment } from '@/services/audit_comments'
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  Project,
} from '@/services/projects'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

export default function Projects() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [auditComments, setAuditComments] = useState<AuditComment[]>([])

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    status: 'active' as 'active' | 'archived' | 'completed',
  })

  const loadProjects = useCallback(async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadComments = useCallback(async () => {
    if (!user) return
    try {
      const data = await pb.collection('audit_comments').getFullList<AuditComment>({
        filter: `project_id.user_id = "${user.id}"`,
      })
      setAuditComments(data)
    } catch (err) {
      console.error('Failed to load audit comments for dashboard:', err)
    }
  }, [user])

  useEffect(() => {
    loadProjects()
    loadComments()
  }, [loadProjects, loadComments])

  useRealtime('projects', () => loadProjects(), !!user)
  useRealtime('audit_comments', () => loadComments(), !!user)

  const totalReviewed = auditComments.filter((c) => c.status === 'approved').length
  const volumeInAudit = auditComments.filter(
    (c) => c.status === 'pending' || c.status === 'rejected',
  ).length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.client.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'Nome e Cliente são obrigatórios.',
      })
      return
    }

    try {
      const newProj = await createProject({
        name: formData.name,
        client: formData.client,
        status: formData.status,
      })
      setIsCreateOpen(false)
      setFormData({ name: '', client: '', status: 'active' })
      toast({ title: 'Sucesso', description: 'Projeto criado com sucesso.' })
      navigate(`/projects/${newProj.id}/import`)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar o projeto.',
      })
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return
    if (!editingProject.name.trim() || !editingProject.client.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'Nome e Cliente são obrigatórios.',
      })
      return
    }

    try {
      await updateProject(editingProject.id, {
        name: editingProject.name,
        client: editingProject.client,
        status: editingProject.status,
      })
      setIsEditOpen(false)
      setEditingProject(null)
      toast({ title: 'Sucesso', description: 'Projeto atualizado com sucesso.' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o projeto.',
      })
    }
  }

  const handleDelete = async () => {
    if (!projectToDelete) return
    try {
      await deleteProject(projectToDelete)
      setProjectToDelete(null)
      toast({ title: 'Sucesso', description: 'Projeto removido com sucesso.' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover o projeto.',
      })
    }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase()),
  )

  const statusColors = {
    active: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
    archived: 'bg-gray-100 text-gray-800 hover:bg-gray-100/80',
    completed: 'bg-green-100 text-green-800 hover:bg-green-100/80',
  }

  const statusLabels = {
    active: 'Ativo',
    archived: 'Arquivado',
    completed: 'Concluído',
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-elevation border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revisado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalReviewed}</div>
            )}
            <p className="text-xs text-muted-foreground">Comentários aprovados</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume em Auditoria</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{volumeInAudit}</div>
            )}
            <p className="text-xs text-muted-foreground">Comentários pendentes ou reprovados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-elevation">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
          <div>
            <CardTitle className="text-2xl">Projetos</CardTitle>
            <CardDescription>Gerencie seus projetos de auditoria.</CardDescription>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="shrink-0 gap-2">
                  <Plus className="h-4 w-4" /> Novo Projeto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Projeto</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes do novo projeto de auditoria.
                  </DialogDescription>
                </DialogHeader>
                <form id="create-project" onSubmit={handleCreate} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome do Projeto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">
                      Cliente <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="client"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v: any) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </form>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
                    Cancelar
                  </Button>
                  <Button type="submit" form="create-project">
                    Criar Projeto
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <img
                src="https://img.usecurling.com/p/300/200?q=empty%20desk&color=blue"
                alt="No projects"
                className="mb-6 rounded-lg opacity-80"
              />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum projeto encontrado
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm text-center">
                Você ainda não possui projetos de auditoria. Crie seu primeiro projeto para começar.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar seu primeiro projeto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}/import`)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[project.status]}>
                        {statusLabels[project.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.created
                        ? format(new Date(project.created), "dd 'de' MMM, yyyy", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${project.id}/import`)}
                          className="text-primary hover:text-primary/80 mr-2"
                        >
                          Abrir
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(project)
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setProjectToDelete(project.id)
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <DialogDescription>Atualize os detalhes do projeto de auditoria.</DialogDescription>
            </DialogHeader>
            {editingProject && (
              <form id="edit-project" onSubmit={handleUpdate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">
                    Nome do Projeto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-client">
                    Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-client"
                    value={editingProject.client}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, client: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editingProject.status}
                    onValueChange={(v: any) => setEditingProject({ ...editingProject, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
                Cancelar
              </Button>
              <Button type="submit" form="edit-project">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!projectToDelete}
          onOpenChange={(open) => !open && setProjectToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita. Todos
                os documentos e comentários associados também poderão ser perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  )
}
