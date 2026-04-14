import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { FileQuestion } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('Erro 404: Usuário tentou acessar uma rota inexistente:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="text-center flex flex-col items-center max-w-md">
        <div className="mb-6 rounded-full bg-primary/10 p-6">
          <FileQuestion className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Ops! A página que você está procurando não foi encontrada ou foi movida.
        </p>
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Voltar para o Início
        </Link>
      </div>
    </div>
  )
}

export default NotFound
