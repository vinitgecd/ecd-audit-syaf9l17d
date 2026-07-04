export interface FailedLine {
  lineNumber: number
  error: string
}

export function generateErrorLogContent(failedLines: FailedLine[]): string {
  const header = 'LOG DE ERROS - IMPORTACAO ECD\n'
  const separator = '=====================================\n\n'
  const body = failedLines.map((line) => `Linha ${line.lineNumber}: ${line.error}`).join('\n')
  return header + separator + body + '\n'
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
