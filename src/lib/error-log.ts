export interface FailedLine {
  lineNumber: number
  error: string
}

export interface ErrorLogDetails {
  timestamp: string
  errorMessage: string
  stackTrace?: string
  progress: number
  phase: string
  failedLines: FailedLine[]
  lastFiveLines?: string[]
  lineNumber?: number
  fileSize?: string
  totalRecords?: number
  uploadedRecords?: number
}

export function generateErrorLogContent(failedLines: FailedLine[]): string {
  const header = 'LOG DE ERROS - IMPORTAÇÃO ECD\n'
  const separator = '=====================================\n\n'
  const body = failedLines.map((line) => `Linha ${line.lineNumber}: ${line.error}`).join('\n')
  return header + separator + body + '\n'
}

export function formatTimestampForFilename(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d}-${h}${min}${s}`
}

export function generateDetailedErrorLog(details: ErrorLogDetails): string {
  const lines: string[] = []
  lines.push('LOG DE ERROS - IMPORTAÇÃO ECD')
  lines.push('=====================================')
  lines.push('')
  lines.push(`Timestamp: ${details.timestamp}`)
  lines.push(`Mensagem de erro: ${details.errorMessage}`)
  if (details.stackTrace) {
    lines.push(`Stack trace:`)
    lines.push(details.stackTrace)
  } else {
    lines.push('Stack trace: Não disponível')
  }
  lines.push(`Dados do progresso atual: ${details.progress}% - ${details.phase}`)
  if (details.lineNumber !== undefined) {
    lines.push(`Linha do erro: ${details.lineNumber}`)
  }
  if (details.fileSize) {
    lines.push(`Tamanho do arquivo: ${details.fileSize}`)
  }
  if (details.totalRecords !== undefined) {
    lines.push(`Total de registros: ${details.totalRecords}`)
  }
  if (details.uploadedRecords !== undefined) {
    lines.push(`Registros enviados: ${details.uploadedRecords}`)
  }
  lines.push('')

  if (details.failedLines.length > 0) {
    lines.push('Linhas com erro:')
    for (const fl of details.failedLines) {
      lines.push(`  Linha ${fl.lineNumber}: ${fl.error}`)
    }
    lines.push('')
  }

  if (details.lastFiveLines && details.lastFiveLines.length > 0) {
    lines.push('Últimas 5 linhas processadas:')
    details.lastFiveLines.forEach((l, i) => {
      lines.push(`  ${i + 1}. ${l.substring(0, 300)}`)
    })
    lines.push('')
  }

  return lines.join('\n') + '\n'
}

export function downloadErrorLog(
  failedLines: FailedLine[],
  filename = 'erro_importacao_ecd.txt',
): void {
  const content = generateErrorLogContent(failedLines)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadDetailedErrorLog(details: ErrorLogDetails): void {
  const content = generateDetailedErrorLog(details)
  const filename = `erro-importacao-${formatTimestampForFilename(new Date())}.txt`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
