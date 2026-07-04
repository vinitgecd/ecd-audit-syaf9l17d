import type PocketBase from 'pocketbase'

export async function parseAndImportEcd(
  file: File,
  projectId: string,
  pb: PocketBase,
  onProgress: (p: number) => void,
) {
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
  }

  if (accounts.length === 0) {
    throw new Error('O arquivo não contém o bloco I050 (Plano de Contas).')
  }

  onProgress(20)

  await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
    method: 'POST',
    body: JSON.stringify({ action: 'clear' }),
  })

  onProgress(30)

  const accRes = await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
    method: 'POST',
    body: JSON.stringify({ action: 'accounts', accounts }),
  })

  const codeToId = accRes.codeToId || {}

  onProgress(40)

  const BATCH_SIZE = 1000
  let totalProcessed = 0

  for (const entry of entries) {
    for (const item of entry.items) {
      item.account_id = codeToId[item.account_code]
      delete item.account_code
    }
    entry.items = entry.items.filter((item: any) => item.account_id)
  }

  const validEntries = entries.filter((e) => e.items.length > 0)

  for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
    const batch = validEntries.slice(i, i + BATCH_SIZE)
    await pb.send(`/backend/v1/projects/${projectId}/import/ecd`, {
      method: 'POST',
      body: JSON.stringify({ action: 'entries', entries: batch }),
    })
    totalProcessed += batch.length
    const p = 40 + Math.floor((totalProcessed / validEntries.length) * 55)
    onProgress(p)
  }

  return { accountsCount: accounts.length, entriesCount: validEntries.length }
}
