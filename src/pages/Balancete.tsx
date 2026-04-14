import { useState, useMemo } from 'react'
import { FileText, Table as TableIcon, FileDown, Search, Filter, Settings2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Mock Data representing the Trial Balance
const MOCK_DATA = [
  {
    nivel: 1,
    codigo: '10000',
    conta: 'ATIVO',
    tipo: 'S',
    saldoInicial: 94432747.51,
    dcInicial: 'D',
    totalDebitos: 321989481.47,
    totalCreditos: 294987504.89,
    saldoFinal: 121434724.09,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 2,
    codigo: '10001',
    conta: 'CIRCULANTE',
    tipo: 'S',
    saldoInicial: 7222944.63,
    dcInicial: 'D',
    totalDebitos: 275363018.07,
    totalCreditos: 277660888.08,
    saldoFinal: 4925074.62,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 3,
    codigo: '10002',
    conta: 'DISPONIVEL',
    tipo: 'S',
    saldoInicial: 5282248.82,
    dcInicial: 'D',
    totalDebitos: 217719505.83,
    totalCreditos: 219904672.33,
    saldoFinal: 3097082.32,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 4,
    codigo: '10009',
    conta: 'BANCOS',
    tipo: 'S',
    saldoInicial: 1372383.54,
    dcInicial: 'D',
    totalDebitos: 179459868.19,
    totalCreditos: 180774078.54,
    saldoFinal: 58173.19,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 5,
    codigo: '10010',
    conta: 'BANCOS CONTA MOVIMENTO',
    tipo: 'S',
    saldoInicial: 1372383.54,
    dcInicial: 'D',
    totalDebitos: 179445763.14,
    totalCreditos: 180759973.49,
    saldoFinal: 58173.19,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 6,
    codigo: '10011',
    conta: 'ITAU AG0188 CC 99635-9',
    tipo: 'A',
    saldoInicial: 10.0,
    dcInicial: 'D',
    totalDebitos: 98310460.26,
    totalCreditos: 98309868.86,
    saldoFinal: 601.4,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 6,
    codigo: '12606',
    conta: 'UY3 - AG 001 - CC 37508474',
    tipo: 'A',
    saldoInicial: 1162597.35,
    dcInicial: 'D',
    totalDebitos: 56111683.07,
    totalCreditos: 57216708.63,
    saldoFinal: 57571.79,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 6,
    codigo: 'SCROW',
    conta: 'SCROW',
    tipo: 'A',
    saldoInicial: 209776.19,
    dcInicial: 'D',
    totalDebitos: 23929590.79,
    totalCreditos: 24139366.98,
    saldoFinal: 0.0,
    dcFinal: '',
    categoria: 'Ativo',
  },
  {
    nivel: 4,
    codigo: '10013',
    conta: 'APLICAÇÕES',
    tipo: 'S',
    saldoInicial: 3812140.94,
    dcInicial: 'D',
    totalDebitos: 38186597.64,
    totalCreditos: 38959864.32,
    saldoFinal: 3038874.26,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 5,
    codigo: '10014',
    conta: 'APLICAÇÕES DE LIQUIDEZ IMEDIATA',
    tipo: 'S',
    saldoInicial: 619745.43,
    dcInicial: 'D',
    totalDebitos: 37770026.68,
    totalCreditos: 38389240.23,
    saldoFinal: 531.88,
    dcFinal: 'D',
    categoria: 'Ativo',
  },
  {
    nivel: 6,
    codigo: '101907',
    conta: 'APLICAÇÃO ITAÚ PRIVILEGE RF',
    tipo: 'A',
    saldoInicial: 515268.66,
    dcInicial: 'D',
    totalDebitos: 19160044.91,
    totalCreditos: 19675313.57,
    saldoFinal: 0.0,
    dcFinal: '',
    categoria: 'Ativo',
  },
  {
    nivel: 1,
    codigo: '20000',
    conta: 'PASSIVO',
    tipo: 'S',
    saldoInicial: 80000000.0,
    dcInicial: 'C',
    totalDebitos: 150000000.0,
    totalCreditos: 170000000.0,
    saldoFinal: 100000000.0,
    dcFinal: 'C',
    categoria: 'Passivo',
  },
  {
    nivel: 2,
    codigo: '20001',
    conta: 'CIRCULANTE',
    tipo: 'S',
    saldoInicial: 30000000.0,
    dcInicial: 'C',
    totalDebitos: 50000000.0,
    totalCreditos: 60000000.0,
    saldoFinal: 40000000.0,
    dcFinal: 'C',
    categoria: 'Passivo',
  },
  {
    nivel: 3,
    codigo: '20002',
    conta: 'FORNECEDORES',
    tipo: 'S',
    saldoInicial: 15000000.0,
    dcInicial: 'C',
    totalDebitos: 20000000.0,
    totalCreditos: 25000000.0,
    saldoFinal: 20000000.0,
    dcFinal: 'C',
    categoria: 'Passivo',
  },
]

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

export default function Balancete() {
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [maxNivel, setMaxNivel] = useState('20')

  const filteredData = useMemo(() => {
    return MOCK_DATA.filter((row) => {
      const matchesSearch =
        row.conta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        category === 'all' || row.categoria.toLowerCase() === category.toLowerCase()
      const matchesNivel = row.nivel <= parseInt(maxNivel || '20', 10)
      return matchesSearch && matchesCategory && matchesNivel
    })
  }, [searchTerm, category, maxNivel])

  const getRowStyle = (nivel: number, tipo: string) => {
    if (nivel === 1) return 'bg-primary text-primary-foreground font-bold hover:bg-primary/90'
    if (nivel === 2) return 'bg-muted font-semibold'
    if (nivel === 3) return 'bg-muted/50 font-medium'
    if (tipo === 'S') return 'font-medium'
    return ''
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 rounded-lg border shadow-sm gap-4">
        <h2 className="text-lg font-bold text-foreground truncate">
          Balancete - NION ENERGIA S.A. (45832752000157) 2023
        </h2>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportar PDF">
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600"
              title="Exportar Excel"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportar TXT">
              <FileDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Níveis:</span>
            <Input
              type="number"
              value={maxNivel}
              onChange={(e) => setMaxNivel(e.target.value)}
              className="w-16 h-8 text-center"
              min="1"
            />
          </div>

          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <span className="text-sm whitespace-nowrap hidden md:inline">
              01/01/2023 a 31/12/2023
            </span>
            <Button variant="outline" size="sm" className="h-8 whitespace-nowrap">
              Alterar Período
            </Button>
          </div>

          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <Button variant="secondary" size="sm" className="h-8">
              <Settings2 className="h-4 w-4 mr-2" />
              Opções
            </Button>
            <Button variant="ghost" size="sm" className="h-8">
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex gap-4 items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou conta..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="passivo">Passivo</SelectItem>
              <SelectItem value="patrimonio">Patrimônio Líquido</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="rounded-md border bg-card flex-1 overflow-auto">
        <Table className="relative min-w-[1000px]">
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-16">Nível</TableHead>
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="w-16 text-center">Tipo</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead className="w-12 text-center">D/C</TableHead>
              <TableHead className="text-right">Total Débitos</TableHead>
              <TableHead className="text-right">Total Créditos</TableHead>
              <TableHead className="text-right">Saldo Final</TableHead>
              <TableHead className="w-12 text-center">D/C</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  Nenhuma conta encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, idx) => (
                <TableRow
                  key={`${row.codigo}-${idx}`}
                  className={cn(
                    'cursor-pointer transition-colors py-1 h-10',
                    getRowStyle(row.nivel, row.tipo),
                  )}
                >
                  <TableCell className="py-2">{row.nivel}</TableCell>
                  <TableCell className="py-2 font-mono text-xs">{row.codigo}</TableCell>
                  <TableCell className="py-2 truncate max-w-[300px]" title={row.conta}>
                    <span style={{ paddingLeft: `${(row.nivel - 1) * 12}px` }}>{row.conta}</span>
                  </TableCell>
                  <TableCell className="py-2 text-center">{row.tipo}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.saldoInicial)}
                  </TableCell>
                  <TableCell className="py-2 text-center">{row.dcInicial}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.totalDebitos)}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.totalCreditos)}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {formatNum(row.saldoFinal)}
                  </TableCell>
                  <TableCell className="py-2 text-center">{row.dcFinal}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
