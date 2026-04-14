migrate(
  (app) => {
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'vinitg44@gmail.com')
    } catch (_) {
      return
    }

    let project
    try {
      project = app.findFirstRecordByData('projects', 'name', 'NION ENERGIA S.A.')
    } catch (_) {
      const projectsCol = app.findCollectionByNameOrId('projects')
      project = new Record(projectsCol)
      project.set('user_id', user.id)
      project.set('name', 'NION ENERGIA S.A.')
      project.set('client', 'NION')
      project.set('status', 'active')
      app.save(project)
    }

    const pId = project.id

    try {
      app.findFirstRecordByData('accounts', 'code', '1.1.1.01')
      return
    } catch (_) {}

    const aCol = app.findCollectionByNameOrId('accounts')
    const accs = [
      { code: '1', name: 'ATIVO', type: 'asset' },
      { code: '1.1', name: 'CIRCULANTE', type: 'asset' },
      { code: '1.1.1', name: 'DISPONIVEL', type: 'asset' },
      { code: '1.1.1.01', name: 'BANCOS', type: 'asset' },
      { code: '2', name: 'PASSIVO', type: 'liability' },
      { code: '2.1', name: 'CIRCULANTE', type: 'liability' },
      { code: '2.1.1', name: 'FORNECEDORES', type: 'liability' },
      { code: '3', name: 'RECEITAS', type: 'revenue' },
      { code: '4', name: 'DESPESAS', type: 'expense' },
    ]

    const createdAccs = {}
    for (const a of accs) {
      const rec = new Record(aCol)
      rec.set('project_id', pId)
      rec.set('code', a.code)
      rec.set('name', a.name)
      rec.set('type', a.type)
      app.save(rec)
      createdAccs[a.code] = rec.id
    }

    const jeCol = app.findCollectionByNameOrId('journal_entries')
    const je = new Record(jeCol)
    je.set('project_id', pId)
    je.set('date', '2023-01-01 10:00:00.000Z')
    je.set('description', 'Aporte Inicial de Capital')
    je.set('reference', 'DEP-01')
    app.save(je)

    const eiCol = app.findCollectionByNameOrId('entry_items')
    const ei1 = new Record(eiCol)
    ei1.set('entry_id', je.id)
    ei1.set('account_id', createdAccs['1.1.1.01'])
    ei1.set('type', 'debit')
    ei1.set('value', 500000)
    app.save(ei1)

    const ei2 = new Record(eiCol)
    ei2.set('entry_id', je.id)
    ei2.set('account_id', createdAccs['3'])
    ei2.set('type', 'credit')
    ei2.set('value', 500000)
    app.save(ei2)

    const je2 = new Record(jeCol)
    je2.set('project_id', pId)
    je2.set('date', '2023-02-15 14:30:00.000Z')
    je2.set('description', 'Pagamento de fornecedores')
    je2.set('reference', 'PG-012')
    app.save(je2)

    const ei3 = new Record(eiCol)
    ei3.set('entry_id', je2.id)
    ei3.set('account_id', createdAccs['2.1.1'])
    ei3.set('type', 'debit')
    ei3.set('value', 35000)
    app.save(ei3)

    const ei4 = new Record(eiCol)
    ei4.set('entry_id', je2.id)
    ei4.set('account_id', createdAccs['1.1.1.01'])
    ei4.set('type', 'credit')
    ei4.set('value', 35000)
    app.save(ei4)
  },
  (app) => {},
)
