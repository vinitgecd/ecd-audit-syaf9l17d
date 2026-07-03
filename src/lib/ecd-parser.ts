import type PocketBase from 'pocketbase'

export interface ImportProgress {
  progress: number
  status: string
}

export async function parseAndImportEcd(
  file: File,
  projectId: string,
  pb: PocketBase,
  onProgress: (p: ImportProgress) => void,
) {
  if (!pb.authStore.isValid) {
    throw new Error('Sua sessão expirou. Faça login novamente para continuar.')
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: pb.authStore.token || '',
  }

  onProgress({ progress: 2, status: 'Lendo arquivo...' })

  const text = await file.text()
  onProgress({ progress: 5, status: 'Analisando estrutura do arquivo ECD...' })

  const lines = text.split(/\r?\n/)
  const accounts: any[] = []
  const entries: any[] = []
  let currentEntry: any = null

  const totalLines = lines.length
  const parseCheckpoint = Math.max(1, Math.floor(totalLines / 10))

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const parts = line.split('|')

    if (parts[1] === 'I050') {
      const codNat = parts[3]
      const indCta = parts[4]
      const level = parseInt(parts[5], 10)
      const codCta = parts[6]
      const codCtaSup = parts[7]
      const name = parts[8]

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
        description: `Lançamento ${numLcto}`,
        reference: numLcto,
        items: [],
      }
      entries.push(currentEntry)
    } else if (parts[1] === 'I250') {
      if (currentEntry) {
        const codCta = parts[2]
        const valStr = parts[4]
        const indDc = parts[5]
        const hist = parts[8]

        if (hist) currentEntry.description = hist

        currentEntry.items.push({
          account_code: codCta,
          type: indDc === 'D' ? 'debit' : 'credit',
          value: parseFloat(valStr ? valStr.replace(',', '.') : '0'),
        })
      }
    }

    if (i > 0 && i % parseCheckpoint === 0) {
      const parseProgress = 5 + Math.floor((i / totalLines) * 10)
      onProgress({
        progress: parseProgress,
        status: `Analisando estrutura... (${accounts.length} contas, ${entries.length} lançamentos)`,
      })
    }
  }

  if (accounts.length === 0) {
    throw new Error('O arquivo não contém o bloco I050 (Plano de Contas).')
  }

  onProgress({ progress: 16, status: 'Limpando dados anteriores...' })

  await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'clear' }),
  })

  onProgress({ progress: 20, status: `Passo 1/3: Importando ${accounts.length} contas...` })

  const accRes = await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'accounts', accounts }),
  })

  const codeToId = accRes.codeToId || {}

  onProgress({ progress: 30, status: 'Mapeando lançamentos com contas...' })

  for (const entry of entries) {
    for (const item of entry.items) {
      item.account_id = codeToId[item.account_code]
      delete item.account_code
    }
    entry.items = entry.items.filter((item: any) => item.account_id)
  }

  const validEntries = entries.filter((e) => e.items.length > 0)

  if (validEntries.length === 0) {
    onProgress({ progress: 100, status: 'Concluído' })
    return { accountsCount: accounts.length, entriesCount: 0 }
  }

  const BATCH_SIZE = 5000
  let totalProcessed = 0

  onProgress({
    progress: 35,
    status: `Passo 2/3: Importando ${validEntries.length} lançamentos...`,
  })

  for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
    const batch = validEntries.slice(i, i + BATCH_SIZE)
    await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'entries', entries: batch }),
    })
    totalProcessed += batch.length
    const p = 35 + Math.floor((totalProcessed / validEntries.length) * 60)
    onProgress({
      progress: p,
      status: `Passo 2/3: Importando lançamentos... (${totalProcessed}/${validEntries.length})`,
    })
  }

  onProgress({ progress: 98, status: 'Passo 3/3: Finalizando importação...' })

  onProgress({ progress: 100, status: 'Importação concluída com sucesso!' })

  return { accountsCount: accounts.length, entriesCount: validEntries.length }
}
