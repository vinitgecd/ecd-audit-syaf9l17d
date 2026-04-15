migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('accounts')

    if (!col.fields.getByName('parent_id')) {
      col.fields.add(
        new RelationField({
          name: 'parent_id',
          collectionId: col.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    if (!col.fields.getByName('level')) {
      col.fields.add(new NumberField({ name: 'level' }))
    }
    if (!col.fields.getByName('nature')) {
      col.fields.add(new TextField({ name: 'nature' }))
    }
    if (!col.fields.getByName('is_group')) {
      col.fields.add(new BoolField({ name: 'is_group' }))
    }
    if (!col.fields.getByName('referential_code')) {
      col.fields.add(new TextField({ name: 'referential_code' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('accounts')
    col.fields.removeByName('parent_id')
    col.fields.removeByName('level')
    col.fields.removeByName('nature')
    col.fields.removeByName('is_group')
    col.fields.removeByName('referential_code')
    app.save(col)
  },
)
