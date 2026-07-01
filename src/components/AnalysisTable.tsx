import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { AnalysisRow } from '@/lib/analysis-utils'
import { formatCurrency, formatPercent } from '@/lib/analysis-utils'
import { cn } from '@/lib/utils'

interface AnalysisTableProps {
  title: string
  description: string
  rows: AnalysisRow[]
  totals?: { label: string; value: number }[]
  emptyMessage: string
}

export function AnalysisTable({
  title,
  description,
  rows,
  totals,
  emptyMessage,
}: AnalysisTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Código</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Saldo Atual (R$)</TableHead>
                  <TableHead className="text-right">AV (%)</TableHead>
                  <TableHead className="text-right">AH (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      row.level === 1 && 'bg-primary/10 font-bold',
                      row.level === 2 && 'bg-muted/60 font-semibold',
                      row.level === 3 && 'bg-muted/30',
                    )}
                  >
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell style={{ paddingLeft: `${(row.level - 1) * 16}px` }}>
                      {row.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.currentBalance)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(row.verticalAnalysis)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(row.horizontalAnalysis)}
                    </TableCell>
                  </TableRow>
                ))}
                {totals?.map((t) => (
                  <TableRow key={t.label} className="border-t-2 font-bold">
                    <TableCell colSpan={2}>{t.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(t.value)}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
