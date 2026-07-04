routerAdd(
  'POST',
  '/backend/v1/ecd/upload-chunk',
  (e) => {
    const body = e.requestInfo().body || {}
    const action = body.action
    const projectId = body.projectId

    if (!action || !projectId) {
      return e.badRequestError('Parâmetros ausentes: projectId e action são obrigatórios.')
    }

    if (action === 'clear') {
      $app.runInTransaction(function (txApp) {
        txApp
          .db()
          .newQuery(
            'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:projectId})',
          )
          .bind({ projectId: projectId })
          .execute()
        txApp
          .db()
          .newQuery('DELETE FROM journal_entries WHERE project_id = {:projectId}')
          .bind({ projectId: projectId })
          .execute()
        txApp
          .db()
          .newQuery('DELETE FROM accounts WHERE project_id = {:projectId}')
          .bind({ projectId: projectId })
          .execute()
      })
      return e.json(200, { success: true, recordsProcessed: 0 })
    }

    var data = body.data
    if (!data) {
      return e.badRequestError('Parâmetro data é obrigatório para esta ação.')
    }

    var parsed = data
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data)
      } catch (err) {
        return e.badRequestError('Dados JSON inválidos.')
      }
    }

    if (action === 'accounts') {
      var accounts = Array.isArray(parsed) ? parsed : []
      var codeToId = {}
      var accErrors = []

      for (var a = 0; a < accounts.length; a++) {
        if (!accounts[a].code) {
          accErrors.push({
            lineNumber: accounts[a]._lineNumber || 0,
            error: 'Codigo de conta ausente',
          })
          continue
        }
        if (!accounts[a].name) {
          accErrors.push({
            lineNumber: accounts[a]._lineNumber || 0,
            error: 'Nome da conta ausente para o codigo: ' + accounts[a].code,
          })
          continue
        }
        codeToId[accounts[a].code] = $security.randomString(15)
      }

      $app.runInTransaction(function (txApp) {
        var now = new Date().toISOString().replace('T', ' ')
        var maxBatch = 2000
        for (var i = 0; i < accounts.length; i += maxBatch) {
          var batch = accounts.slice(i, i + maxBatch)
          var values = []
          var params = {}
          for (var j = 0; j < batch.length; j++) {
            var acc = batch[j]
            var id = codeToId[acc.code]
            var parentId = acc.parent_code ? codeToId[acc.parent_code] : ''

            values.push(
              '({:id_' +
                j +
                '}, {:project_id_' +
                j +
                '}, {:code_' +
                j +
                '}, {:name_' +
                j +
                '}, {:type_' +
                j +
                '}, {:level_' +
                j +
                '}, {:nature_' +
                j +
                '}, {:is_group_' +
                j +
                '}, {:parent_id_' +
                j +
                '}, {:created_' +
                j +
                '}, {:updated_' +
                j +
                '})',
            )
            params['id_' + j] = id
            params['project_id_' + j] = projectId
            params['code_' + j] = acc.code
            params['name_' + j] = acc.name
            params['type_' + j] = acc.type
            params['level_' + j] = acc.level || 1
            params['nature_' + j] = acc.nature || ''
            params['is_group_' + j] = acc.is_group ? true : false
            params['parent_id_' + j] = parentId || ''
            params['created_' + j] = now
            params['updated_' + j] = now
          }
          if (values.length > 0) {
            var sql =
              'INSERT INTO accounts (id, project_id, code, name, type, level, nature, is_group, parent_id, created, updated) VALUES '
            txApp
              .db()
              .newQuery(sql + values.join(', '))
              .bind(params)
              .execute()
          }
        }
      })

      return e.json(200, {
        success: true,
        recordsProcessed: accounts.length,
        codeToId: codeToId,
        errors: accErrors,
      })
    }

    if (action === 'entries') {
      var entries = Array.isArray(parsed) ? parsed : []
      var insertedEntries = 0
      var insertedItems = 0
      var chunkErrors = []

      $app.runInTransaction(function (txApp) {
        var now = new Date().toISOString().replace('T', ' ')
        var entryRows = []
        var itemRows = []

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i]
          var entryLineNum = entry._lineNumber || 0
          if (!entry.items || entry.items.length === 0) {
            chunkErrors.push({
              lineNumber: entryLineNum,
              error: 'Lancamento sem partidas (debito/credito)',
            })
            continue
          }
          if (!entry.date) {
            chunkErrors.push({
              lineNumber: entryLineNum,
              error: 'Data do lancamento invalida ou ausente',
            })
            continue
          }
          var hasValidItems = false
          for (var vi = 0; vi < entry.items.length; vi++) {
            var vItem = entry.items[vi]
            if (!vItem.account_id) {
              chunkErrors.push({
                lineNumber: entryLineNum,
                error: 'Conta contabil nao encontrada para a partida',
              })
              continue
            }
            if (!vItem.type || (vItem.type !== 'debit' && vItem.type !== 'credit')) {
              chunkErrors.push({
                lineNumber: entryLineNum,
                error: 'Tipo de partida invalido (deve ser debito ou credito)',
              })
              continue
            }
            if (isNaN(vItem.value) || vItem.value === 0) {
              chunkErrors.push({
                lineNumber: entryLineNum,
                error: 'Valor da partida invalido ou zero',
              })
              continue
            }
            hasValidItems = true
          }
          if (!hasValidItems) continue
          var entryId = $security.randomString(15)
          entryRows.push({
            id: entryId,
            project_id: projectId,
            date: entry.date,
            description: entry.description || 'Lançamento',
            reference: entry.reference || '',
            created: now,
            updated: now,
          })
          for (var j = 0; j < entry.items.length; j++) {
            var item = entry.items[j]
            if (item.account_id) {
              itemRows.push({
                id: $security.randomString(15),
                entry_id: entryId,
                account_id: item.account_id,
                type: item.type,
                value: item.value,
                created: now,
                updated: now,
              })
            }
          }
        }

        var maxEntryBatch = 4000
        for (var i2 = 0; i2 < entryRows.length; i2 += maxEntryBatch) {
          var eBatch = entryRows.slice(i2, i2 + maxEntryBatch)
          var eValues = []
          var eParams = {}
          for (var j2 = 0; j2 < eBatch.length; j2++) {
            var b = eBatch[j2]
            eValues.push(
              '({:id_' +
                j2 +
                '}, {:project_id_' +
                j2 +
                '}, {:date_' +
                j2 +
                '}, {:description_' +
                j2 +
                '}, {:reference_' +
                j2 +
                '}, {:created_' +
                j2 +
                '}, {:updated_' +
                j2 +
                '})',
            )
            eParams['id_' + j2] = b.id
            eParams['project_id_' + j2] = b.project_id
            eParams['date_' + j2] = b.date
            eParams['description_' + j2] = b.description
            eParams['reference_' + j2] = b.reference
            eParams['created_' + j2] = b.created
            eParams['updated_' + j2] = b.updated
          }
          if (eValues.length > 0) {
            var eSql =
              'INSERT INTO journal_entries (id, project_id, date, description, reference, created, updated) VALUES '
            txApp
              .db()
              .newQuery(eSql + eValues.join(', '))
              .bind(eParams)
              .execute()
          }
          insertedEntries += eBatch.length
        }

        var maxItemBatch = 4000
        for (var i3 = 0; i3 < itemRows.length; i3 += maxItemBatch) {
          var iBatch = itemRows.slice(i3, i3 + maxItemBatch)
          var iValues = []
          var iParams = {}
          for (var j3 = 0; j3 < iBatch.length; j3++) {
            var ib = iBatch[j3]
            iValues.push(
              '({:id_' +
                j3 +
                '}, {:entry_id_' +
                j3 +
                '}, {:account_id_' +
                j3 +
                '}, {:type_' +
                j3 +
                '}, {:value_' +
                j3 +
                '}, {:created_' +
                j3 +
                '}, {:updated_' +
                j3 +
                '})',
            )
            iParams['id_' + j3] = ib.id
            iParams['entry_id_' + j3] = ib.entry_id
            iParams['account_id_' + j3] = ib.account_id
            iParams['type_' + j3] = ib.type
            iParams['value_' + j3] = ib.value
            iParams['created_' + j3] = ib.created
            iParams['updated_' + j3] = ib.updated
          }
          if (iValues.length > 0) {
            var iSql =
              'INSERT INTO entry_items (id, entry_id, account_id, type, value, created, updated) VALUES '
            txApp
              .db()
              .newQuery(iSql + iValues.join(', '))
              .bind(iParams)
              .execute()
          }
          insertedItems += iBatch.length
        }
      })

      return e.json(200, {
        success: true,
        recordsProcessed: insertedEntries + insertedItems,
        entries: insertedEntries,
        items: insertedItems,
        errors: chunkErrors,
      })
    }

    return e.badRequestError('Ação inválida: ' + action)
  },
  $apis.requireAuth(),
)
