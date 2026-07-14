migrate(
  (app) => {
    try {
      const existing = app.findCollectionByNameOrId('account_balances')
      app.delete(existing)
    } catch (_) {}

    const projectsCol = app.findCollectionByNameOrId('projects')
    const accountsCol = app.findCollectionByNameOrId('accounts')

    const collection = new Collection({
      name: 'account_balances',
      type: 'view',
      listRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      viewQuery: `SELECT a.id, a.project_id, a.code, a.name, a.type, a.parent_id, a.level, a.nature, a.is_group, a.created, a.updated,
        (SELECT COALESCE(SUM(ei.value), 0) FROM entry_items ei WHERE ei.account_id = a.id AND ei.type = 'debit') as total_debits,
        (SELECT COALESCE(SUM(ei.value), 0) FROM entry_items ei WHERE ei.account_id = a.id AND ei.type = 'credit') as total_credits
      FROM accounts a`,
      fields: [
        {
          name: 'project_id',
          type: 'relation',
          required: false,
          collectionId: projectsCol.id,
          maxSelect: 1,
        },
        { name: 'code', type: 'text', required: false },
        { name: 'name', type: 'text', required: false },
        {
          name: 'type',
          type: 'select',
          required: false,
          values: ['asset', 'liability', 'equity', 'revenue', 'expense'],
          maxSelect: 1,
        },
        {
          name: 'parent_id',
          type: 'relation',
          required: false,
          collectionId: accountsCol.id,
          maxSelect: 1,
        },
        { name: 'level', type: 'number', required: false },
        { name: 'nature', type: 'text', required: false },
        { name: 'is_group', type: 'bool', required: false },
        { name: 'total_debits', type: 'json', required: false },
        { name: 'total_credits', type: 'json', required: false },
        { name: 'created', type: 'date', required: false },
        { name: 'updated', type: 'date', required: false },
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const existing = app.findCollectionByNameOrId('account_balances')
      app.delete(existing)
    } catch (_) {}
  },
)
