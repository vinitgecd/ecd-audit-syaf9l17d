routerAdd(
  'POST',
  '/backend/v1/ecd/upload-chunk',
  (e) => {
    var body = e.requestInfo().body || {}
    var projectId = body.projectId
    var action = body.action
    var fileId = body.fileId

    if (!projectId || !action || !fileId) {
      return e.badRequestError('Parametros ausentes: projectId, action e fileId sao obrigatorios.')
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
      return e.json(200, { success: true, inserted: 0 })
    }

    if (action !== 'upload') {
      return e.badRequestError('Acao invalida: ' + action)
    }

    var records = body.records
    if (!records || !Array.isArray(records)) {
      return e.badRequestError('records ausente ou invalido')
    }

    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      if (
        typeof r.type !== 'string' ||
        typeof r.fields !== 'object' ||
        r.fields === null ||
        Array.isArray(r.fields) ||
        typeof r.projectId !== 'string'
      ) {
        return e.badRequestError('Registro invalido')
      }
    }

    try {
      var inserted = 0
      $app.runInTransaction(function (txApp) {
        var now = new Date().toISOString().replace('T', ' ')

        var accountRecords = []
        var entryRecords = []
        for (var i = 0; i < records.length; i++) {
          if (records[i].type === 'account') accountRecords.push(records[i])
          else if (records[i].type === 'entry') entryRecords.push(records[i])
        }

        if (accountRecords.length > 0) {
          var accValues = []
          var accParams = {}
          for (var i = 0; i < accountRecords.length; i++) {
            var f = accountRecords[i].fields
            accValues.push(
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
            accParams['id_' + i] = f.id
            accParams['pid_' + i] = projectId
            accParams['code_' + i] = f.code
            accParams['name_' + i] = f.name
            accParams['type_' + i] = f.accountType
            accParams['level_' + i] = f.level || 1
            accParams['nature_' + i] = f.nature || ''
            accParams['is_group_' + i] = f.is_group ? 1 : 0
            accParams['parent_id_' + i] = f.parent_id || ''
            accParams['created_' + i] = now
            accParams['updated_' + i] = now
          }
          txApp
            .db()
            .newQuery(
              'INSERT INTO accounts (id, project_id, code, name, type, level, nature, is_group, parent_id, created, updated) VALUES ' +
                accValues.join(', '),
            )
            .bind(accParams)
            .execute()
          inserted += accountRecords.length
        }

        for (var i = 0; i < entryRecords.length; i++) {
          var ef = entryRecords[i].fields
          var entryId = ef.id

          txApp
            .db()
            .newQuery(
              'INSERT INTO journal_entries (id, project_id, date, description, reference, created, updated) VALUES ({:id}, {:pid}, {:date}, {:desc}, {:ref}, {:created}, {:updated})',
            )
            .bind({
              id: entryId,
              pid: projectId,
              date: ef.date,
              desc: ef.description || 'Lancamento',
              ref: ef.reference || '',
              created: now,
              updated: now,
            })
            .execute()
          inserted++

          var items = ef.items || []
          if (items.length > 0) {
            var itemValues = []
            var itemParams = {}
            for (var j = 0; j < items.length; j++) {
              var item = items[j]
              itemValues.push(
                '({:iid_' +
                  j +
                  '}, {:ientry_' +
                  j +
                  '}, {:iacc_' +
                  j +
                  '}, {:itype_' +
                  j +
                  '}, {:ival_' +
                  j +
                  '}, {:icreated_' +
                  j +
                  '}, {:iupdated_' +
                  j +
                  '})',
              )
              itemParams['iid_' + j] = $security.randomString(15)
              itemParams['ientry_' + j] = entryId
              itemParams['iacc_' + j] = item.account_id
              itemParams['itype_' + j] = item.type
              itemParams['ival_' + j] = item.value
              itemParams['icreated_' + j] = now
              itemParams['iupdated_' + j] = now
            }
            txApp
              .db()
              .newQuery(
                'INSERT INTO entry_items (id, entry_id, account_id, type, value, created, updated) VALUES ' +
                  itemValues.join(', '),
              )
              .bind(itemParams)
              .execute()
            inserted += items.length
          }
        }
      })

      return e.json(200, { success: true, inserted: inserted })
    } catch (err) {
      return e.json(500, { error: 'Erro ao salvar dados' })
    }
  },
  $apis.requireAuth(),
)
