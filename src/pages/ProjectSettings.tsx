import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
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
import { Trash2, AlertTriangle, RefreshCcw } from 'lucide-react'
import { deleteProject } from '@/services/projects'
import pb from '@/lib/pocketbase/client'

export default function ProjectSettings() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isResetOpen, setIsResetOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleReset = async () => {
    if (!projectId) return
    setIsResetting(true)
    toast({ title: 'Aguarde', description: 'Limpando dados do projeto...' })
    try {
      await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
        method: 'POST',
        body: JSON.stringify({ action: 'clear' }),
      })
      toast({ title: 'Sucesso', description: 'Dados do projeto resetados com sucesso.' })
      setIsResetOpen(false)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao resetar o projeto.' })
    } finally {
      setIsResetting(false)
    }
  }

  const handleDelete = async () => {
    if (!projectId) return
    setIsDeleting(true)
    toast({ title: 'Aguarde', description: 'Excluindo projeto e dados...' })
    try {
      await deleteProject(projectId)
      toast({ title: 'Sucesso', description: 'Projeto excluído com sucesso.' })
      navigate('/projects')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir o projeto.' })
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Configurações do Projeto</h2>
        <p className="text-muted-foreground mt-1">
          Gerencie as opções avançadas e os dados do projeto atual.
        </p>
      </div>

      <Card className="border-destructive/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis que afetarão os dados deste projeto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-4 bg-card hover:bg-muted/30 transition-colors">
            <div>
              <h4 className="font-medium text-foreground">Resetar Dados do Projeto</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-[600px]">
                Remove todos os lançamentos contábeis, contas e arquivos ECD importados, mantendo o
                projeto vazio.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => setIsResetOpen(true)}
              disabled={isResetting}
            >
              {isResetting ? (
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Resetar Projeto
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-destructive/20 bg-destructive/5 rounded-lg gap-4 transition-colors">
            <div>
              <h4 className="font-medium text-destructive">Excluir Projeto</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-[600px]">
                Exclui permanentemente o projeto e todos os dados, documentos e análises associados
                a ele.
              </p>
            </div>
            <Button
              variant="destructive"
              className="shrink-0"
              onClick={() => setIsDeleteOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Trash2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir Projeto
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Dados do Projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação apagará todos os dados contábeis (contas, lançamentos, itens) importados
              para este projeto. O projeto voltará ao estado inicial (vazio). Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleReset()
              }}
              disabled={isResetting}
            >
              {isResetting ? 'Resetando...' : 'Confirmar Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Projeto Definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto inteiro? Esta ação é completamente
              irreversível e apagará o projeto, comentários, dados e todos os arquivos anexados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Projeto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
