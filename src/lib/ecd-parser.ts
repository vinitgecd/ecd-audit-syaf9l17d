import type { FailedLine } from '@/lib/error-log'

const CHUNK_SIZE = 1024 * 1024
const BATCH_SIZE = 50

export interface EcdBatch {
  action: 'clear' | 'accounts' | 'entries'
  data: any[]
  batchIndex: number
  totalBatches: number
}

export interface ParseResult {
  totalAccounts: number
  totalEntries: number
  failedLines: FailedLine[]
}

export interface ParseCallbacks {
  onProgress: (progress: number, phase: string) => void
  onBatch: (batch: EcdBatch) => Promise<any>
  onParseComplete?: (totals: { totalAccounts: number; totalEntries: number }) => void
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint32Array(15))
  let id = ''
  for (let i = 0; i < 15; i++) id += chars[values[i] % chars.length]
  return id
}

export async function parseAndImportEcd(file: File, cb: ParseCallbacks): Promise<ParseResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const failedLines: FailedLine[] = []
  const accounts: any[] = []
  const entries: any[] = []
  const codeToId: Record<string, string> = {}
  let currentEntry: any = null
  let leftover = ''
  let lineNum = 0

  for (let ci = 0; ci < totalChunks; ci++) {
    const start = ci * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const text = await file.slice(start, end).text()
    const lines = (leftover + text).split(/\r?\n/)
    leftover = lines.pop() || ''

    for (const line of lines) {
      lineNum++
      if (!line.trim()) continue
      const parts = line.split('|')
      try {
        if (parts[1] === 'I050') {
          const code = parts[6] || ''
          const name = parts[8] || ''
          if (!code || !name) {
            failedLines.push({ lineNumber: lineNum, error: 'Dados de conta ausentes no I050' })
            continue
          }
          const codNat = parts[3] || ''
          const indCta = parts[4] || ''
          let type = 'asset'
          if (codNat === '02') type = 'liability'
          else if (codNat === '03') type = 'equity'
          else if (codNat === '04') type = code.startsWith('3') ? 'revenue' : 'expense'
          else if (codNat) type = 'expense'
          const id = generateId()
          codeToId[code] = id
          accounts.push({
            id,
            code,
            name,
            type,
            level: parseInt(parts[5] || '1', 10) || 1,
            nature: codNat,
            is_group: indCta === 'S',
            parent_code: parts[7] || '',
            _lineNumber: lineNum,
          })
        } else if (parts[1] === 'I200') {
          const dtLcto = parts[3] || ''
          let date = new Date().toISOString()
          if (dtLcto.length === 8)
            date = `${dtLcto.substring(4, 8)}-${dtLcto.substring(2, 4)}-${dtLcto.substring(0, 2)}T00:00:00.000Z`
          currentEntry = {
            date,
            description: parts[8] || `Lancamento ${parts[2] || ''}`,
            reference: parts[2] || '',
            items: [],
            _lineNumber: lineNum,
          }
          entries.push(currentEntry)
        } else if (parts[1] === 'I250' && currentEntry) {
          const val = parseFloat((parts[4] || '0').replace(',', '.'))
          if (isNaN(val) || val === 0) {
            failedLines.push({ lineNumber: lineNum, error: 'Valor invalido ou zero no I250' })
            continue
          }
          if (parts[8]) currentEntry.description = parts[8]
          currentEntry.items.push({
            account_code: parts[2] || '',
            type: parts[5] === 'D' ? 'debit' : 'credit',
            value: val,
          })
        }
      } catch {
        failedLines.push({ lineNumber: lineNum, error: 'Erro ao processar linha' })
      }
    }

    await new Promise((r) => setTimeout(r, 0))
    const phase = ci === 0 ? 'reading' : 'processing'
    cb.onProgress(Math.floor(((ci + 1) / totalChunks) * 90), phase)
  }

  if (leftover.trim()) {
    lineNum++
    const parts = leftover.split('|')
    try {
      if (parts[1] === 'I050') {
        const code = parts[6] || ''
        const name = parts[8] || ''
        if (code && name) {
          const codNat = parts[3] || ''
          let type = 'asset'
          if (codNat === '02') type = 'liability'
          else if (codNat === '03') type = 'equity'
          else if (codNat === '04') type = code.startsWith('3') ? 'revenue' : 'expense'
          else if (codNat) type = 'expense'
          const id = generateId()
          codeToId[code] = id
          accounts.push({
            id,
            code,
            name,
            type,
            level: parseInt(parts[5] || '1', 10) || 1,
            nature: codNat,
            is_group: parts[4] === 'S',
            parent_code: parts[7] || '',
            _lineNumber: lineNum,
          })
        }
      }
    } catch {
      failedLines.push({ lineNumber: lineNum, error: 'Erro ao processar linha' })
    }
  }

  if (accounts.length === 0) throw new Error('O arquivo nao contem o bloco I050 (Plano de Contas).')

  accounts.sort((a, b) => (a.level || 1) - (b.level || 1))
  for (const a of accounts) {
    if (a.parent_code) {
      a.parent_id = codeToId[a.parent_code] || ''
      delete a.parent_code
    }
  }
  for (const e of entries) {
    for (const item of e.items) {
      item.account_id = codeToId[item.account_code] || ''
      if (
        !item.account_id &&
        !failedLines.some(
          (f) => f.lineNumber === e._lineNumber && f.error.includes(item.account_code),
        )
      )
        failedLines.push({
          lineNumber: e._lineNumber,
          error: `Conta nao encontrada: ${item.account_code}`,
        })
      delete item.account_code
    }
    e.items = e.items.filter((i: any) => i.account_id)
  }

  const validEntries = entries.filter((e) => e.items.length > 0)
  for (const e of entries.filter((e) => e.items.length === 0))
    if (!failedLines.some((f) => f.lineNumber === e._lineNumber))
      failedLines.push({ lineNumber: e._lineNumber, error: 'Lancamento sem partidas validas' })

  cb.onParseComplete?.({ totalAccounts: accounts.length, totalEntries: validEntries.length })

  cb.onProgress(90, 'uploading')
  await cb.onBatch({ action: 'clear', data: [], batchIndex: 0, totalBatches: 0 })

  const uploadBatched = async (
    action: 'accounts' | 'entries',
    records: any[],
    baseProg: number,
    range: number,
  ) => {
    const total = Math.max(1, Math.ceil(records.length / BATCH_SIZE))
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const bi = Math.floor(i / BATCH_SIZE)
      await cb.onBatch({
        action,
        data: records.slice(i, i + BATCH_SIZE),
        batchIndex: bi,
        totalBatches: total,
      })
      cb.onProgress(baseProg + Math.floor(((bi + 1) / total) * range), 'uploading')
    }
  }

  await uploadBatched('accounts', accounts, 90, 5)
  await uploadBatched('entries', validEntries, 95, 5)
  cb.onProgress(100, 'uploading')

  return { totalAccounts: accounts.length, totalEntries: validEntries.length, failedLines }
}
