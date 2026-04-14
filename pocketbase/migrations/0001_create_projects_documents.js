migrate(
  (app) => {
    const projects = new Collection({
      name: 'projects',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'client', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['active', 'archived', 'completed'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_projects_user_id ON projects (user_id)'],
    })
    app.save(projects)

    const documents = new Collection({
      name: 'documents',
      type: 'base',
      listRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && project_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'project_id',
          type: 'relation',
          required: true,
          collectionId: projects.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'type', type: 'text' },
        {
          name: 'file',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'application/xml',
            'text/xml',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_documents_project_id ON documents (project_id)'],
    })
    app.save(documents)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('documents'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('projects'))
    } catch (_) {}
  },
)
