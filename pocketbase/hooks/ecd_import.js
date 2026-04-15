routerAdd(
  'POST',
  '/backend/v1/projects/{id}/import/ecd',
  (e) => {
    const projectId = e.request.pathValue('id')
    const body = e.requestInfo().body

    if (!body || !body.accounts) {
      return e.badRequestError('Invalid payload')
    }

    let accountsCount = 0

    $app.runInTransaction((txApp) => {
      const accCol = txApp.findCollectionByNameOrId('accounts')
      const codeToId = {}

      const accounts = body.accounts || []
      accounts.sort((a, b) => a.level - b.level)

      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i]
        const record = new Record(accCol)
        record.set('project_id', projectId)
        record.set('code', acc.code)
        record.set('name', acc.name)
        record.set('type', acc.type)
        record.set('level', acc.level)
        record.set('nature', acc.nature)
        record.set('is_group', acc.is_group)

        if (acc.parent_code && codeToId[acc.parent_code]) {
          record.set('parent_id', codeToId[acc.parent_code])
        }

        txApp.save(record)
        codeToId[acc.code] = record.id
        accountsCount++
      }

      const entries = body.entries || []
      if (entries.length > 0) {
        const entryCol = txApp.findCollectionByNameOrId('journal_entries')
        const itemCol = txApp.findCollectionByNameOrId('entry_items')

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          if (!entry.items || entry.items.length === 0) continue

          const entRecord = new Record(entryCol)
          entRecord.set('project_id', projectId)
          entRecord.set('date', entry.date)
          entRecord.set('description', entry.description || 'Lançamento')
          entRecord.set('reference', entry.reference || '')
          txApp.save(entRecord)

          for (let j = 0; j < entry.items.length; j++) {
            const item = entry.items[j]
            if (codeToId[item.account_code]) {
              const itemRecord = new Record(itemCol)
              itemRecord.set('entry_id', entRecord.id)
              itemRecord.set('account_id', codeToId[item.account_code])
              itemRecord.set('type', item.type)
              itemRecord.set('value', item.value)
              txApp.save(itemRecord)
            }
          }
        }
      }
    })

    return e.json(200, { success: true, accounts: accountsCount })
  },
  $apis.requireAuth(),
)
