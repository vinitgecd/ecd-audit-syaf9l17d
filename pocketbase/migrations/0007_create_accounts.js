migrate(
  (app) => {
    const collection = new Collection({
      name: 'accounts',
      type: 'base',
      listRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'project_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('projects').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'code', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['asset', 'liability', 'equity', 'revenue', 'expense'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_accounts_project ON accounts (project_id)',
        'CREATE INDEX idx_accounts_code ON accounts (code)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('accounts'))
  },
)
