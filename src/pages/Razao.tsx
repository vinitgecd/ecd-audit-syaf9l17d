import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileDown, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const formatNum = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

const MOCK_RAZAO_DATA = [
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'D',
    valor: 20.0,
    saldo: 11276.49,
    dcSaldo: 'D',
    historico:
      'Valor ref.receb juros(oobs)dupl: 11359 -Panificadora Monte Castelo conf. financeiro filial: CP',
    numero: '1306',
  },
  {
    data: '07/01/2015',
    codigoConta: '1332',
    conta: 'JUROS OBTIDOS',
    dc: 'C',
    valor: 20.0,
    saldo: 11276.49,
    dcSaldo: 'D',
    historico:
      'Valor ref.receb juros(oobs)dupl: 11359 -Panificadora Monte Castelo conf. financeiro filial: CP',
    numero: '1306',
  },
  {
    data: '07/01/2015',
    codigoConta: '710',
    conta: 'LANCHES E REFEIÇÕES',
    dc: 'D',
    valor: 60.0,
    saldo: 11216.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Lanches e refeicoes - motoristas rota barauna-conf. financeiro filial: CP',
    numero: '1308',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 60.0,
    saldo: 11216.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Lanches e refeicoes - motoristas rota barauna-conf. financeiro filial: CP',
    numero: '1308',
  },
  {
    data: '07/01/2015',
    codigoConta: '1350',
    conta: 'TRANSPORTE DE MERCADORIAS',
    dc: 'D',
    valor: 20.0,
    saldo: 11196.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Gorjeta/enlonamento moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1310',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 20.0,
    saldo: 11196.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. Gorjeta/enlonamento moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1310',
  },
  {
    data: '07/01/2015',
    codigoConta: '1242',
    conta: 'OMEGA DISTRIBUIDORA DE BATERIAS LTDA',
    dc: 'D',
    valor: 1100.0,
    saldo: 10096.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. 1620 - mys 5566 02 baterias omega nf 16449-conf. financeiro filial: Natal',
    numero: '1314',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 1100.0,
    saldo: 10096.49,
    dcSaldo: 'D',
    historico: 'Pg. ref. 1620 - mys 5566 02 baterias omega nf 16449-conf. financeiro filial: Natal',
    numero: '1314',
  },
  {
    data: '07/01/2015',
    codigoConta: '710',
    conta: 'LANCHES E REFEIÇÕES',
    dc: 'D',
    valor: 39.0,
    saldo: 10057.49,
    dcSaldo: 'D',
    historico:
      'Pg. ref. Lanches e refeicoes - motoristas moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1319',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'C',
    valor: 39.0,
    saldo: 10057.49,
    dcSaldo: 'D',
    historico:
      'Pg. ref. Lanches e refeicoes - motoristas moinho 30/06/15-conf. financeiro filial: CP',
    numero: '1319',
  },
  {
    data: '07/01/2015',
    codigoConta: '5',
    conta: 'CAIXA GERAL',
    dc: 'D',
    valor: 1.77,
    saldo: 10059.26,
    dcSaldo: 'D',
    historico:
      'Valor ref juros na baixa duplic. 55738-18-Eugenio Tavares De Barros conf. financeiro filial: NATAL',
    numero: '1324',
  },
]

export default function Razao() {
  const navigate = useNavigate()
  const { accountId } = useParams()

  // In a real scenario, we'd fetch the account details using accountId
  // Here we use the mock data corresponding to the user story
  const accountInfo = {
    codigo: accountId || '5',
    descricao: 'CAIXA GERAL',
    saldoInicial: '11.256,49 D',
    saldoFinal: '10.059,26 D',
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/balancete')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl font-bold text-foreground">Razão Analítico</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <FileDown className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Account Summary Panel */}
      <Card className="shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Empresa</span>
            <span
              className="text-sm font-semibold truncate"
              title="DISPAN DISTRIBUIDORA E COMERCIO DE PRODUTOS PARA PANIFICAÇÃO LTDA ME"
            >
              DISPAN DISTRIBUIDORA E COMERCIO...
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">CNPJ: 08.381.848/0001-10</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Conta Selecionada
            </span>
            <span className="text-sm font-semibold">
              {accountInfo.codigo} - {accountInfo.descricao}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">01/01/2015 a 31/12/2015</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Saldo Inicial
            </span>
            <span className="text-lg font-bold text-blue-600">{accountInfo.saldoInicial}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase">Saldo Final</span>
            <span className="text-lg font-bold text-green-600">{accountInfo.saldoFinal}</span>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <div className="rounded-md border bg-card flex-1 overflow-auto">
        <Table className="relative min-w-[1200px]">
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead className="w-[100px]">Cód. Conta</TableHead>
              <TableHead className="w-[250px]">Conta</TableHead>
              <TableHead className="w-[50px] text-center">D/C</TableHead>
              <TableHead className="w-[120px] text-right">Valor</TableHead>
              <TableHead className="w-[150px] text-right">Saldo</TableHead>
              <TableHead>Histórico</TableHead>
              <TableHead className="w-[100px] text-right">Número</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_RAZAO_DATA.map((row, idx) => {
              const isMainAccount = row.codigoConta === accountInfo.codigo
              return (
                <TableRow
                  key={idx}
                  className={cn(
                    'transition-colors py-1 h-10',
                    isMainAccount ? 'bg-muted/20 font-medium' : 'text-muted-foreground',
                  )}
                >
                  <TableCell className="py-2 text-sm">{row.data}</TableCell>
                  <TableCell className="py-2 text-sm font-mono">{row.codigoConta}</TableCell>
                  <TableCell className="py-2 text-sm truncate max-w-[250px]" title={row.conta}>
                    {row.conta}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-center font-medium">
                    <span className={cn(row.dc === 'D' ? 'text-blue-600' : 'text-red-600')}>
                      {row.dc}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-sm text-right tabular-nums">
                    {formatNum(row.valor)}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-right tabular-nums">
                    {formatNum(row.saldo)}{' '}
                    <span className="text-muted-foreground text-xs ml-1">{row.dcSaldo}</span>
                  </TableCell>
                  <TableCell
                    className="py-2 text-sm text-muted-foreground line-clamp-2 min-w-[300px]"
                    title={row.historico}
                  >
                    {row.historico}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-right font-mono text-muted-foreground">
                    {row.numero}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
