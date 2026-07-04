routerAdd(
  'POST',
  '/backend/v1/projects/{id}/import/ecd',
  (e) => {
    const projectId = e.request.pathValue('id')
    const body = e.requestInfo().body

    if (!body || !body.action) {
      return e.badRequestError('Invalid payload: missing action')
    }

    const action = body.action

    if (action === 'clear') {
      $app.runInTransaction((txApp) => {
        txApp
          .db()
          .newQuery(
            'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:projectId})',
          )
          .bind({ projectId })
          .execute()
        txApp
          .db()
          .newQuery('DELETE FROM journal_entries WHERE project_id = {:projectId}')
          .bind({ projectId })
          .execute()
        txApp
          .db()
          .newQuery('DELETE FROM accounts WHERE project_id = {:projectId}')
          .bind({ projectId })
          .execute()
      })
      return e.json(200, { success: true })
    }

    if (action === 'accounts') {
      const accounts = body.accounts || []
      const codeToId = {}

      for (let i = 0; i < accounts.length; i++) {
        codeToId[accounts[i].code] = $security.randomString(15)
      }

      $app.runInTransaction((txApp) => {
        const now = new Date().toISOString().replace('T', ' ')
        const maxBatch = 2000
        for (let i = 0; i < accounts.length; i += maxBatch) {
          const batch = accounts.slice(i, i + maxBatch)
          let sql =
            'INSERT INTO accounts (id, project_id, code, name, type, level, nature, is_group, parent_id, created, updated) VALUES '
          const params = {}
          const values = []
          for (let j = 0; j < batch.length; j++) {
            const acc = batch[j]
            const id = codeToId[acc.code]
            const parentId = acc.parent_code ? codeToId[acc.parent_code] : ''

            values.push(
              `({:id_${j}}, {:project_id_${j}}, {:code_${j}}, {:name_${j}}, {:type_${j}}, {:level_${j}}, {:nature_${j}}, {:is_group_${j}}, {:parent_id_${j}}, {:created_${j}}, {:updated_${j}})`,
            )
            params[`id_${j}`] = id
            params[`project_id_${j}`] = projectId
            params[`code_${j}`] = acc.code
            params[`name_${j}`] = acc.name
            params[`type_${j}`] = acc.type
            params[`level_${j}`] = acc.level || 1
            params[`nature_${j}`] = acc.nature || ''
            params[`is_group_${j}`] = acc.is_group ? true : false
            params[`parent_id_${j}`] = parentId || ''
            params[`created_${j}`] = now
            params[`updated_${j}`] = now
          }
          txApp
            .db()
            .newQuery(sql + values.join(', '))
            .bind(params)
            .execute()
        }
      })
      return e.json(200, { success: true, codeToId })
    }

    if (action === 'entries') {
      const entries = body.entries || []
      let insertedEntries = 0
      let insertedItems = 0

      $app.runInTransaction((txApp) => {
        const now = new Date().toISOString().replace('T', ' ')
        const entryRows = []
        const itemRows = []

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          if (!entry.items || entry.items.length === 0) continue

          const entryId = $security.randomString(15)
          entryRows.push({
            id: entryId,
            project_id: projectId,
            date: entry.date,
            description: entry.description || 'Lançamento',
            reference: entry.reference || '',
            created: now,
            updated: now,
          })

          for (let j = 0; j < entry.items.length; j++) {
            const item = entry.items[j]
            const accountId = item.account_id
            if (accountId) {
              itemRows.push({
                id: $security.randomString(15),
                entry_id: entryId,
                account_id: accountId,
                type: item.type,
                value: item.value,
                created: now,
                updated: now,
              })
            }
          }
        }

        const maxEntryBatch = 4000
        for (let i = 0; i < entryRows.length; i += maxEntryBatch) {
          const batch = entryRows.slice(i, i + maxEntryBatch)
          let sql =
            'INSERT INTO journal_entries (id, project_id, date, description, reference, created, updated) VALUES '
          const params = {}
          const values = []
          for (let j = 0; j < batch.length; j++) {
            const b = batch[j]
            values.push(
              `({:id_${j}}, {:project_id_${j}}, {:date_${j}}, {:description_${j}}, {:reference_${j}}, {:created_${j}}, {:updated_${j}})`,
            )
            params[`id_${j}`] = b.id
            params[`project_id_${j}`] = b.project_id
            params[`date_${j}`] = b.date
            params[`description_${j}`] = b.description
            params[`reference_${j}`] = b.reference
            params[`created_${j}`] = b.created
            params[`updated_${j}`] = b.updated
          }
          txApp
            .db()
            .newQuery(sql + values.join(', '))
            .bind(params)
            .execute()
          insertedEntries += batch.length
        }

        const maxItemBatch = 4000
        for (let i = 0; i < itemRows.length; i += maxItemBatch) {
          const batch = itemRows.slice(i, i + maxItemBatch)
          let sql =
            'INSERT INTO entry_items (id, entry_id, account_id, type, value, created, updated) VALUES '
          const params = {}
          const values = []
          for (let j = 0; j < batch.length; j++) {
            const b = batch[j]
            values.push(
              `({:id_${j}}, {:entry_id_${j}}, {:account_id_${j}}, {:type_${j}}, {:value_${j}}, {:created_${j}}, {:updated_${j}})`,
            )
            params[`id_${j}`] = b.id
            params[`entry_id_${j}`] = b.entry_id
            params[`account_id_${j}`] = b.account_id
            params[`type_${j}`] = b.type
            params[`value_${j}`] = b.value
            params[`created_${j}`] = b.created
            params[`updated_${j}`] = b.updated
          }
          txApp
            .db()
            .newQuery(sql + values.join(', '))
            .bind(params)
            .execute()
          insertedItems += batch.length
        }
      })

      return e.json(200, { success: true, entries: insertedEntries, items: insertedItems })
    }

    return e.badRequestError('Invalid action')
  },
  $apis.requireAuth(),
)
