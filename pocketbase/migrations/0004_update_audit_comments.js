migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('audit_comments')
    col.fields.add(
      new SelectField({
        name: 'status',
        values: ['pending', 'approved', 'rejected'],
        maxSelect: 1,
        required: false,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('audit_comments')
    col.fields.removeByName('status')
    app.save(col)
  },
)
