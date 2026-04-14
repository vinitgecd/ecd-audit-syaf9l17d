import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Line,
  LineChart,
  Area,
  AreaChart,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const monthlyData = [
  { name: 'Jan', receitas: 4000, despesas: 2400 },
  { name: 'Fev', receitas: 3000, despesas: 1398 },
  { name: 'Mar', receitas: 2000, despesas: 9800 },
  { name: 'Abr', receitas: 2780, despesas: 3908 },
  { name: 'Mai', receitas: 1890, despesas: 4800 },
  { name: 'Jun', receitas: 2390, despesas: 3800 },
  { name: 'Jul', receitas: 3490, despesas: 4300 },
]

const balanceData = [
  { name: 'Ativo', total: 150000, circulante: 90000, naocirculante: 60000 },
  { name: 'Passivo', total: 120000, circulante: 50000, naocirculante: 70000 },
  { name: 'PL', total: 30000, circulante: 30000, naocirculante: 0 },
]

const chartConfig = {
  receitas: { label: 'Receitas', color: 'hsl(var(--chart-1))' },
  despesas: { label: 'Despesas', color: 'hsl(var(--chart-2))' },
  circulante: { label: 'Circulante', color: 'hsl(var(--chart-3))' },
  naocirculante: { label: 'Não Circ.', color: 'hsl(var(--chart-4))' },
}

export default function Analysis() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Análise Contábil</h2>
          <p className="text-muted-foreground mt-1">
            Visão detalhada e auditoria dos balancetes importados.
          </p>
        </div>
        <Select defaultValue="2023">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ano Exercício" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2023">Exercício 2023</SelectItem>
            <SelectItem value="2022">Exercício 2022</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Índice de Liquidez Corrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">1.80</div>
            <p className="text-xs text-green-600 font-medium mt-1">↑ 0.15 vs ano anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Grau de Endividamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">45%</div>
            <p className="text-xs text-red-600 font-medium mt-1">↑ 5% vs ano anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inconsistências (Alertas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">3</div>
            <p className="text-xs text-muted-foreground mt-1">Contas com saldo invertido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margem Líquida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">12.4%</div>
            <p className="text-xs text-green-600 font-medium mt-1">Estável</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demonstração de Resultado</CardTitle>
            <CardDescription>Evolução de receitas vs despesas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R${v / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="var(--color-receitas)"
                    fill="var(--color-receitas)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stroke="var(--color-despesas)"
                    fill="var(--color-despesas)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Composição Patrimonial</CardTitle>
            <CardDescription>Estrutura do Ativo e Passivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <BarChart data={balanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R${v / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="circulante"
                    stackId="a"
                    fill="var(--color-circulante)"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="naocirculante"
                    stackId="a"
                    fill="var(--color-naocirculante)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Auditoria</CardTitle>
          <CardDescription>Cruzamentos automatizados baseados no SPED</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                id: 1,
                title: 'Saldo da conta "Caixa" credor',
                desc: 'Conta 1.1.01.01 apresenta saldo credor de R$ 5.430,00 no balancete de encerramento.',
                type: 'error',
              },
              {
                id: 2,
                title: 'Variação abrupta em Despesas Administrativas',
                desc: 'Aumento de 240% nas despesas de conservação e manutenção no mês de Março.',
                type: 'warning',
              },
              {
                id: 3,
                title: 'Divergência Tributária',
                desc: 'O valor da provisão de IRPJ difere da base de cálculo apurada no LALUR (diferença: R$ 1.200,00).',
                type: 'error',
              },
            ].map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`p-2 rounded-full ${alert.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}
                >
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
