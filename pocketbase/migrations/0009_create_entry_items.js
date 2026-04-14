migrate(
  (app) => {
    const collection = new Collection({
      name: 'entry_items',
      type: 'base',
      listRule: "@request.auth.id != '' && entry_id.project_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && entry_id.project_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'entry_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('journal_entries').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'account_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('accounts').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'type', type: 'select', required: true, values: ['debit', 'credit'], maxSelect: 1 },
        { name: 'value', type: 'number', required: true, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_entry_items_entry ON entry_items (entry_id)',
        'CREATE INDEX idx_entry_items_account ON entry_items (account_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('entry_items'))
  },
)
