migrate(
  (app) => {
    const collection = new Collection({
      name: 'journal_entries',
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
        { name: 'date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true },
        { name: 'reference', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_journal_entries_project ON journal_entries (project_id)',
        'CREATE INDEX idx_journal_entries_date ON journal_entries (date)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('journal_entries'))
  },
)
