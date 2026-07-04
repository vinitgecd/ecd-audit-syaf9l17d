import type PocketBase from 'pocketbase'
import type { FailedLine } from '@/lib/error-log'

export async function parseAndImportEcd(
  file: File,
  projectId: string,
  pb: PocketBase,
  onProgress: (p: number) => void,
): Promise<{
  accountsCount: number
  entriesCount: number
  failedLines: FailedLine[]
}> {
  const failedLines: FailedLine[] = []
  onProgress(5)
  const text = await file.text()
  onProgress(10)

  const lines = text.split(/\r?\n/)
  const accounts: any[] = []
  const entries: any[] = []
  let currentEntry: any = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const parts = line.split('|')

    try {
      if (parts[1] === 'I050') {
        const codNat = parts[3]
        const indCta = parts[4]
        const level = parseInt(parts[5], 10)
        const codCta = parts[6]
        const codCtaSup = parts[7]
        const name = parts[8]

        if (!codCta) {
          failedLines.push({ lineNumber: i + 1, error: 'Codigo de conta ausente no registro I050' })
          continue
        }
        if (!name) {
          failedLines.push({ lineNumber: i + 1, error: 'Nome da conta ausente no registro I050' })
          continue
        }

        let type = 'asset'
        if (codNat === '02') type = 'liability'
        else if (codNat === '03') type = 'equity'
        else if (codNat === '04') {
          type = codCta.startsWith('3') ? 'revenue' : 'expense'
        } else if (codNat) {
          type = 'expense'
        }

        accounts.push({
          code: codCta,
          name: name,
          type: type,
          level: isNaN(level) ? 1 : level,
          nature: codNat,
          is_group: indCta === 'S',
          parent_code: codCtaSup,
          _lineNumber: i + 1,
        })
      } else if (parts[1] === 'I200') {
        const numLcto = parts[2]
        const dtLcto = parts[3]
        let date = new Date().toISOString()
        if (dtLcto && dtLcto.length === 8) {
          date = new Date(
            `${dtLcto.substring(4, 8)}-${dtLcto.substring(2, 4)}-${dtLcto.substring(0, 2)}`,
          ).toISOString()
        }
        currentEntry = {
          date,
          description: `Lancamento ${numLcto}`,
          reference: numLcto,
          items: [],
          _lineNumber: i + 1,
        }
        entries.push(currentEntry)
      } else if (parts[1] === 'I250') {
        if (currentEntry) {
          const codCta = parts[2]
          const valStr = parts[4]
          const indDc = parts[5]
          const hist = parts[8]

          if (hist) currentEntry.description = hist

          const value = parseFloat(valStr ? valStr.replace(',', '.') : '0')
          if (isNaN(value) || value === 0) {
            failedLines.push({
              lineNumber: i + 1,
              error: 'Valor invalido ou zero no registro I250',
            })
            continue
          }

          currentEntry.items.push({
            account_code: codCta,
            type: indDc === 'D' ? 'debit' : 'credit',
            value: value,
          })
        }
      }
    } catch {
      failedLines.push({ lineNumber: i + 1, error: 'Erro ao processar linha' })
    }
  }

  if (accounts.length === 0) {
    throw new Error('O arquivo nao contem o bloco I050 (Plano de Contas).')
  }

  onProgress(20)

  try {
    await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
      method: 'POST',
      body: JSON.stringify({ action: 'clear' }),
    })
  } catch (error) {
    failedLines.push({
      lineNumber: 0,
      error:
        'Erro ao limpar dados existentes: ' +
        (error instanceof Error ? error.message : 'erro desconhecido'),
    })
  }

  onProgress(30)

  let codeToId: Record<string, string> = {}
  try {
    const accRes = await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
      method: 'POST',
      body: JSON.stringify({ action: 'accounts', accounts }),
    })
    codeToId = accRes.codeToId || {}
    if (accRes.errors && Array.isArray(accRes.errors)) {
      failedLines.push(...accRes.errors)
    }
  } catch (error) {
    failedLines.push({
      lineNumber: 0,
      error:
        'Erro ao importar plano de contas: ' +
        (error instanceof Error ? error.message : 'erro desconhecido'),
    })
  }

  onProgress(40)

  const BATCH_SIZE = 1000
  let totalProcessed = 0

  for (const entry of entries) {
    for (const item of entry.items) {
      item.account_id = codeToId[item.account_code]
      if (!item.account_id) {
        if (
          !failedLines.some(
            (f) => f.lineNumber === entry._lineNumber && f.error.includes(item.account_code),
          )
        ) {
          failedLines.push({
            lineNumber: entry._lineNumber,
            error: `Conta contabil nao encontrada: ${item.account_code}`,
          })
        }
      }
      delete item.account_code
    }
    entry.items = entry.items.filter((item: any) => item.account_id)
  }

  const validEntries = entries.filter((e) => e.items.length > 0)
  const skippedEntries = entries.filter((e) => e.items.length === 0)
  for (const entry of skippedEntries) {
    if (!failedLines.some((f) => f.lineNumber === entry._lineNumber)) {
      failedLines.push({ lineNumber: entry._lineNumber, error: 'Lancamento sem partidas validas' })
    }
  }

  for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
    const batch = validEntries.slice(i, i + BATCH_SIZE)
    const batchLineNumbers = batch.map((e) => e._lineNumber)
    try {
      const res = await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
        method: 'POST',
        body: JSON.stringify({ action: 'entries', entries: batch }),
      })
      if (res.errors && Array.isArray(res.errors)) {
        failedLines.push(...res.errors)
      }
      totalProcessed += batch.length
      const p = 40 + Math.floor((totalProcessed / validEntries.length) * 55)
      onProgress(p)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'erro desconhecido'
      for (const ln of batchLineNumbers) {
        failedLines.push({ lineNumber: ln, error: `Erro no envio do lote: ${errorMsg}` })
      }
    }
  }

  return { accountsCount: accounts.length, entriesCount: validEntries.length, failedLines }
}
