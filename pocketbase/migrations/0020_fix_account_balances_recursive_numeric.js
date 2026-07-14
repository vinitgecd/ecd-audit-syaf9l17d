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
      viewQuery: `SELECT a.id, a.project_id, a.code, a.name, a.type, a.parent_id, a.level, a.nature, a.is_group, a.referential_code, a.created, a.updated,
       COALESCE(r.total_debits, 0) as total_debits,
       COALESCE(r.total_credits, 0) as total_credits
FROM accounts a
LEFT JOIN (
  SELECT account_id,
         SUM(CASE WHEN type = 'debit' THEN value ELSE 0 END) as total_debits,
         SUM(CASE WHEN type = 'credit' THEN value ELSE 0 END) as total_credits
  FROM entry_items
  GROUP BY account_id
) r ON r.account_id = a.id`,
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
        { name: 'referential_code', type: 'text', required: false },
        { name: 'total_debits', type: 'number', required: false },
        { name: 'total_credits', type: 'number', required: false },
        { name: 'created', type: 'autodate', required: false, onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', required: false, onCreate: true, onUpdate: true },
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
