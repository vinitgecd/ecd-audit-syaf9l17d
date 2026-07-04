/// <reference lib="webworker" />

interface EcdRecord {
  id: string
  type: 'I050' | 'I200' | 'I250'
  fields: Record<string, any>
  lineNumber: number
}

interface WorkerInput {
  content: string
  chunkSize: number
}

let counter = 0

function parseLine(line: string, lineNumber: number): EcdRecord | null {
  const parts = line.split('|')
  const recType = parts[1]

  if (recType === 'I050') {
    const codNat = parts[3] || ''
    const indCta = parts[4] || ''
    const level = parseInt(parts[5] || '1', 10)
    const codCta = parts[6] || ''
    const codCtaSup = parts[7] || ''
    const name = parts[8] || ''

    let accountType = 'asset'
    if (codNat === '02') accountType = 'liability'
    else if (codNat === '03') accountType = 'equity'
    else if (codNat === '04') accountType = codCta.startsWith('3') ? 'revenue' : 'expense'
    else if (codNat) accountType = 'expense'

    return {
      id: `rec_${counter++}`,
      type: 'I050',
      fields: {
        code: codCta,
        name,
        accountType,
        level: isNaN(level) ? 1 : level,
        nature: codNat,
        is_group: indCta === 'S',
        parent_code: codCtaSup,
      },
      lineNumber,
    }
  }

  if (recType === 'I200') {
    const numLcto = parts[2] || ''
    const dtLcto = parts[3] || ''
    let date = new Date().toISOString()
    if (dtLcto && dtLcto.length === 8) {
      date = `${dtLcto.substring(4, 8)}-${dtLcto.substring(2, 4)}-${dtLcto.substring(0, 2)}T00:00:00.000Z`
    }
    return {
      id: `rec_${counter++}`,
      type: 'I200',
      fields: { date, description: `Lançamento ${numLcto}`, reference: numLcto },
      lineNumber,
    }
  }

  if (recType === 'I250') {
    const codCta = parts[2] || ''
    const valStr = parts[4] || '0'
    const indDc = parts[5] || 'D'
    const hist = parts[8] || ''
    return {
      id: `rec_${counter++}`,
      type: 'I250',
      fields: {
        account_code: codCta,
        type: indDc === 'D' ? 'debit' : 'credit',
        value: parseFloat(valStr.replace(',', '.') || '0'),
        description: hist,
      },
      lineNumber,
    }
  }

  return null
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  try {
    const { content, chunkSize = 500 } = e.data
    const lines = content.split(/\r?\n/)
    const totalRecords = lines.length
    const records: EcdRecord[] = []
    let processed = 0
    let currentEntryId: string | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) {
        processed++
        continue
      }

      const record = parseLine(line, i + 1)
      if (record) {
        if (record.type === 'I200') {
          currentEntryId = record.id
        } else if (record.type === 'I250' && currentEntryId) {
          record.fields.entry_id = currentEntryId
        }
        records.push(record)
      }

      processed++
      if (processed % chunkSize === 0) {
        const progress = Math.min(95, Math.floor((processed / totalRecords) * 100))
        self.postMessage({
          type: 'progress',
          progress,
          processedRecords: processed,
          totalRecords,
          currentChunk: records.slice(-chunkSize),
        })
      }
    }

    self.postMessage({
      type: 'complete',
      progress: 100,
      processedRecords: processed,
      totalRecords,
      records,
    })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Erro ao processar o arquivo ECD.',
    })
  }
}
