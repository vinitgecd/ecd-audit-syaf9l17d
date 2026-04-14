migrate(
  (app) => {
    const projectsCol = app.findCollectionByNameOrId('projects')
    const usersCol = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      name: 'audit_comments',
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
          collectionId: projectsCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'entry_reference', type: 'text', required: true },
        { name: 'comment', type: 'text', required: true },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_comments_project ON audit_comments (project_id)',
        'CREATE INDEX idx_audit_comments_entry ON audit_comments (entry_reference)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('audit_comments')
    app.delete(collection)
  },
)
