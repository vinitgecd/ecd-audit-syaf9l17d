routerAdd(
  'POST',
  '/backend/v1/ecd/upload-chunk',
  (e) => {
    const body = e.requestInfo().body || {}
    const projectId = body.projectId
    const action = body.action

    if (!projectId || !action) {
      return e.badRequestError('Parametros ausentes: projectId e action sao obrigatorios.')
    }

    var data = null
    if (Array.isArray(body.data)) {
      data = body.data
    } else if (body.data) {
      return e.badRequestError('Dados invalidos: esperado um array.')
    }

    if (action === 'clear') {
      $app.runInTransaction(function (txApp) {
        txApp
          .db()
          .newQuery(
            'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:pid})',
          )
          .bind({ pid: projectId })
          .execute()
        txApp
          .db()
          .newQuery('DELETE FROM journal_entries WHERE project_id = {:pid}')
          .bind({ pid: projectId })
          .execute()
        txApp
          .db()
          .newQuery('DELETE FROM accounts WHERE project_id = {:pid}')
          .bind({ pid: projectId })
          .execute()
      })
      return e.json(200, { success: true, recordsProcessed: 0 })
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return e.badRequestError('Dados invalidos ou vazios para a acao: ' + action)
    }

    if (action === 'accounts') {
      var accErrors = []
      $app.runInTransaction(function (txApp) {
        var now = new Date().toISOString().replace('T', ' ')
        var values = []
        var params = {}
        for (var i = 0; i < data.length; i++) {
          var acc = data[i]
          if (!acc.code || !acc.name) {
            accErrors.push({
              lineNumber: acc._lineNumber || 0,
              error: 'Codigo ou nome da conta ausente',
            })
            continue
          }
          values.push(
            '({:id_' +
              i +
              '}, {:pid_' +
              i +
              '}, {:code_' +
              i +
              '}, {:name_' +
              i +
              '}, {:type_' +
              i +
              '}, {:level_' +
              i +
              '}, {:nature_' +
              i +
              '}, {:is_group_' +
              i +
              '}, {:parent_id_' +
              i +
              '}, {:created_' +
              i +
              '}, {:updated_' +
              i +
              '})',
          )
          params['id_' + i] = acc.id
          params['pid_' + i] = projectId
          params['code_' + i] = acc.code
          params['name_' + i] = acc.name
          params['type_' + i] = acc.type
          params['level_' + i] = acc.level || 1
          params['nature_' + i] = acc.nature || ''
          params['is_group_' + i] = acc.is_group ? 1 : 0
          params['parent_id_' + i] = acc.parent_id || ''
          params['created_' + i] = now
          params['updated_' + i] = now
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
      })
      return e.json(200, { success: true, recordsProcessed: data.length, errors: accErrors })
    }

    if (action === 'entries') {
      var insertedEntries = 0
      var insertedItems = 0
      var entryErrors = []
      $app.runInTransaction(function (txApp) {
        var now = new Date().toISOString().replace('T', ' ')
        var entryValues = []
        var entryParams = {}
        var itemValues = []
        var itemParams = {}

        for (var i = 0; i < data.length; i++) {
          var entry = data[i]
          if (!entry.items || entry.items.length === 0) {
            entryErrors.push({
              lineNumber: entry._lineNumber || 0,
              error: 'Lancamento sem partidas',
            })
            continue
          }
          if (!entry.date) {
            entryErrors.push({ lineNumber: entry._lineNumber || 0, error: 'Data invalida' })
            continue
          }
          entryValues.push(
            '({:eid_' +
              i +
              '}, {:epid_' +
              i +
              '}, {:edate_' +
              i +
              '}, {:edesc_' +
              i +
              '}, {:eref_' +
              i +
              '}, {:ecreated_' +
              i +
              '}, {:eupdated_' +
              i +
              '})',
          )
          entryParams['eid_' + i] = entry.id || $security.randomString(15)
          entryParams['epid_' + i] = projectId
          entryParams['edate_' + i] = entry.date
          entryParams['edesc_' + i] = entry.description || 'Lancamento'
          entryParams['eref_' + i] = entry.reference || ''
          entryParams['ecreated_' + i] = now
          entryParams['eupdated_' + i] = now
          insertedEntries++

          for (var j = 0; j < entry.items.length; j++) {
            var item = entry.items[j]
            if (!item.account_id) {
              entryErrors.push({
                lineNumber: entry._lineNumber || 0,
                error: 'Conta nao encontrada',
              })
              continue
            }
            var idx = itemValues.length
            itemValues.push(
              '({:iid_' +
                idx +
                '}, {:ientry_' +
                idx +
                '}, {:iacc_' +
                idx +
                '}, {:itype_' +
                idx +
                '}, {:ival_' +
                idx +
                '}, {:icreated_' +
                idx +
                '}, {:iupdated_' +
                idx +
                '})',
            )
            itemParams['iid_' + idx] = $security.randomString(15)
            itemParams['ientry_' + idx] = entryParams['eid_' + i]
            itemParams['iacc_' + idx] = item.account_id
            itemParams['itype_' + idx] = item.type
            itemParams['ival_' + idx] = item.value
            itemParams['icreated_' + idx] = now
            itemParams['iupdated_' + idx] = now
            insertedItems++
          }
        }

        if (entryValues.length > 0) {
          var eSql =
            'INSERT INTO journal_entries (id, project_id, date, description, reference, created, updated) VALUES '
          txApp
            .db()
            .newQuery(eSql + entryValues.join(', '))
            .bind(entryParams)
            .execute()
        }
        if (itemValues.length > 0) {
          var iSql =
            'INSERT INTO entry_items (id, entry_id, account_id, type, value, created, updated) VALUES '
          txApp
            .db()
            .newQuery(iSql + itemValues.join(', '))
            .bind(itemParams)
            .execute()
        }
      })
      return e.json(200, {
        success: true,
        entries: insertedEntries,
        items: insertedItems,
        errors: entryErrors,
      })
    }

    return e.badRequestError('Acao invalida: ' + action)
  },
  $apis.requireAuth(),
)
