migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId('projects')
    const comments = app.findCollectionByNameOrId('audit_comments')
    const users = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      name: 'audit_logs',
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
          collectionId: projects.id,
          maxSelect: 1,
        },
        {
          name: 'comment_id',
          type: 'relation',
          required: true,
          collectionId: comments.id,
          maxSelect: 1,
        },
        { name: 'user_id', type: 'relation', required: true, collectionId: users.id, maxSelect: 1 },
        { name: 'action', type: 'text', required: true },
        { name: 'details', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_logs_comment ON audit_logs (comment_id)',
        'CREATE INDEX idx_audit_logs_project ON audit_logs (project_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('audit_logs')
    app.delete(collection)
  },
)
