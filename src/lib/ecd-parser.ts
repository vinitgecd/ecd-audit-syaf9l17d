const CHUNK_SIZE = 1024 * 1024

export interface UploadRecord {
  type: string
  fields: Record<string, unknown>
  projectId: string
  lineNumber: number
}

export interface FailedLine {
  lineNumber: number
  error: string
}

export interface ParseResult {
  accounts: UploadRecord[]
  entries: UploadRecord[]
  accountsCount: number
  entriesCount: number
  failedLines: FailedLine[]
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint32Array(15))
  let id = ''
  for (let i = 0; i < 15; i++) id += chars[values[i] % chars.length]
  return id
}

function parseAccountType(codNat: string, code: string): string {
  if (codNat === '02') return 'liability'
  if (codNat === '03') return 'equity'
  if (codNat === '04') return code.startsWith('3') ? 'revenue' : 'expense'
  if (codNat) return 'expense'
  return 'asset'
}

export async function parseAndImportEcd(
  file: File,
  projectId: string,
  onProgress: (progress: number) => void,
  isCancelled?: () => boolean,
): Promise<ParseResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const failedLines: FailedLine[] = []
  const accounts: UploadRecord[] = []
  const entries: UploadRecord[] = []
  const codeToId: Record<string, string> = {}
  let currentEntryItems: Array<Record<string, unknown>> | null = null
  let leftover = ''
  let lineNum = 0

  for (let ci = 0; ci < totalChunks; ci++) {
    if (isCancelled?.()) throw new Error('CANCELLED')

    const start = ci * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const text = await file.slice(start, end).text()
    const lines = (leftover + text).split(/\r?\n/)
    leftover = lines.pop() || ''

    for (const line of lines) {
      lineNum++
      if (!line.trim()) continue

      try {
        const parts = line.split('|')
        const recType = parts[1] || ''

        if (recType === 'I050') {
          const code = parts[6] || ''
          const name = parts[8] || ''
          if (!code || !name) {
            failedLines.push({ lineNumber: lineNum, error: 'Dados de conta ausentes no I050' })
            continue
          }
          const codNat = parts[3] || ''
          const id = generateId()
          codeToId[code] = id
          accounts.push({
            type: 'account',
            fields: {
              id,
              code,
              name,
              accountType: parseAccountType(codNat, code),
              level: parseInt(parts[5] || '1', 10) || 1,
              nature: codNat,
              is_group: (parts[4] || '') === 'S',
              parent_code: parts[7] || '',
            },
            projectId,
            lineNumber: lineNum,
          })
        } else if (recType === 'I200') {
          const dtLcto = parts[3] || ''
          let date = new Date().toISOString()
          if (dtLcto.length === 8) {
            date = `${dtLcto.substring(4, 8)}-${dtLcto.substring(2, 4)}-${dtLcto.substring(0, 2)}T00:00:00.000Z`
          }
          const id = generateId()
          currentEntryItems = []
          entries.push({
            type: 'entry',
            fields: {
              id,
              date,
              description: parts[8] || `Lancamento ${parts[2] || ''}`,
              reference: parts[2] || '',
              items: currentEntryItems,
            },
            projectId,
            lineNumber: lineNum,
          })
        } else if (recType === 'I250' && currentEntryItems) {
          const val = parseFloat((parts[4] || '0').replace(',', '.'))
          if (isNaN(val) || val === 0) {
            failedLines.push({ lineNumber: lineNum, error: 'Valor invalido ou zero no I250' })
            continue
          }
          if (parts[8]) {
            const lastEntry = entries[entries.length - 1]
            lastEntry.fields.description = parts[8]
          }
          currentEntryItems.push({
            account_code: parts[2] || '',
            type: parts[5] === 'D' ? 'debit' : 'credit',
            value: val,
          })
        }
      } catch {
        failedLines.push({ lineNumber: lineNum, error: 'Erro ao processar linha' })
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 0))
    onProgress(Math.floor(((ci + 1) / totalChunks) * 100))
  }

  if (leftover.trim()) {
    lineNum++
    try {
      const parts = leftover.split('|')
      if ((parts[1] || '') === 'I050') {
        const code = parts[6] || ''
        const name = parts[8] || ''
        if (code && name) {
          const codNat = parts[3] || ''
          const id = generateId()
          codeToId[code] = id
          accounts.push({
            type: 'account',
            fields: {
              id,
              code,
              name,
              accountType: parseAccountType(codNat, code),
              level: parseInt(parts[5] || '1', 10) || 1,
              nature: codNat,
              is_group: (parts[4] || '') === 'S',
              parent_code: parts[7] || '',
            },
            projectId,
            lineNumber: lineNum,
          })
        }
      }
    } catch {
      failedLines.push({ lineNumber: lineNum, error: 'Erro ao processar linha' })
    }
  }

  if (accounts.length === 0) {
    throw new Error('O arquivo nao contem o bloco I050 (Plano de Contas).')
  }

  accounts.sort((a, b) => (a.fields.level as number) - (b.fields.level as number))
  for (const acc of accounts) {
    const parentCode = acc.fields.parent_code as string
    if (parentCode) {
      acc.fields.parent_id = codeToId[parentCode] || ''
    }
    delete acc.fields.parent_code
  }

  for (const entry of entries) {
    const items = entry.fields.items as Array<Record<string, unknown>>
    for (const item of items) {
      const accountCode = item.account_code as string
      item.account_id = codeToId[accountCode] || ''
      if (
        !item.account_id &&
        !failedLines.some((f) => f.lineNumber === entry.lineNumber && f.error.includes(accountCode))
      ) {
        failedLines.push({
          lineNumber: entry.lineNumber,
          error: `Conta nao encontrada: ${accountCode}`,
        })
      }
      delete item.account_code
    }
    entry.fields.items = items.filter((i) => i.account_id)
  }

  const validEntries = entries.filter((e) => (e.fields.items as unknown[]).length > 0)
  for (const e of entries) {
    if (
      (e.fields.items as unknown[]).length === 0 &&
      !failedLines.some((f) => f.lineNumber === e.lineNumber)
    ) {
      failedLines.push({ lineNumber: e.lineNumber, error: 'Lancamento sem partidas validas' })
    }
  }

  return {
    accounts,
    entries: validEntries,
    accountsCount: accounts.length,
    entriesCount: validEntries.length,
    failedLines,
  }
}

export async function parseEcdFile(file: File): Promise<{
  accounts: Record<string, unknown>[]
  entries: Record<string, unknown>[]
  failedLines: FailedLine[]
}> {
  const result = await parseAndImportEcd(
    file,
    '',
    () => {},
    () => false,
  )
  return {
    accounts: result.accounts.map((a) => a.fields),
    entries: result.entries.map((e) => e.fields),
    failedLines: result.failedLines,
  }
}
