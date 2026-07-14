migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('accounts')
    col.addIndex('idx_accounts_project_code', false, 'project_id,code', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('accounts')
    col.removeIndex('idx_accounts_project_code')
    app.save(col)
  },
)
