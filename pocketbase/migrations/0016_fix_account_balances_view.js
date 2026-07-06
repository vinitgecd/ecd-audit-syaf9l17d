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
            COALESCE(SUM(CASE WHEN ei.type = 'debit' THEN ei.value ELSE 0 END), 0) as total_debits,
            COALESCE(SUM(CASE WHEN ei.type = 'credit' THEN ei.value ELSE 0 END), 0) as total_credits
         FROM accounts a
         LEFT JOIN entry_items ei ON ei.account_id = a.id
         GROUP BY a.id`,
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
        { name: 'type', type: 'text', required: false },
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
        { name: 'total_debits', type: 'number', required: false },
        { name: 'total_credits', type: 'number', required: false },
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
